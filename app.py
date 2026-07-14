import os
import time
import numpy as np
import tensorflow as tf
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from tensorflow.keras.models import load_model
from PIL import Image

app = Flask(__name__)

# Configure upload rules
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB Max upload size

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Diagnostic Class Labels
CLASS_LABELS = {
    0: 'Glioma',
    1: 'Meningioma',
    2: 'No Tumor',
    3: 'Pituitary'
}

# Global placeholder for model
keras_model = None

def get_model():
    """Loads model once during runtime for inference."""
    global keras_model
    if keras_model is None:
        model_path = os.path.join(os.getcwd(), 'models', 'model.h5')
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
        print(f"Loading Keras model from {model_path}...")
        # Load with compile=False as we are only using the model for inference
        keras_model = load_model(model_path, compile=False)
        print("Model loaded successfully.")
    return keras_model

def generate_gradcam(img_path, model, overlay_path, last_conv_layer_name="block5_conv3"):
    """Generates Grad-CAM activation heatmap overlay for visual explainability."""
    # 1. Load image and preprocess
    img = Image.open(img_path).convert('RGB')
    img_resized = img.resize((128, 128))
    img_array = np.array(img_resized) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    
    # 2. Get VGG16 model and layer
    vgg_model = model.get_layer('vgg16')
    last_conv_layer = vgg_model.get_layer(last_conv_layer_name)
    
    # Find position of VGG16 in sequential model
    vgg_index = 0
    for i, layer in enumerate(model.layers):
        if layer.name == 'vgg16':
            vgg_index = i
            break
            
    # Create sub-model of VGG16
    vgg_grad_model = tf.keras.Model(
        inputs=vgg_model.inputs,
        outputs=[last_conv_layer.output, vgg_model.output]
    )
    
    # 3. Tape gradients
    with tf.GradientTape() as tape:
        conv_outputs, vgg_outputs = vgg_grad_model(img_array)
        
        # Pass through remaining sequential layers
        x = vgg_outputs
        for i in range(vgg_index + 1, len(model.layers)):
            x = model.layers[i](x)
            
        pred_index = tf.argmax(x[0])
        class_channel = x[:, pred_index]

    grads = tape.gradient(class_channel, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    
    # Apply ReLU
    heatmap = tf.maximum(heatmap, 0)
    
    # Normalize between [0, 1]
    max_val = tf.reduce_max(heatmap)
    if max_val > 0:
        heatmap = heatmap / max_val
        
    heatmap_np = heatmap.numpy()
    
    # 4. Generate colored heatmap overlay
    heatmap_img = Image.fromarray((heatmap_np * 255).astype(np.uint8))
    heatmap_resized = heatmap_img.resize(img.size, Image.Resampling.LANCZOS)
    heatmap_resized_np = np.array(heatmap_resized) / 255.0
    
    # Custom Jet Color Map
    r = np.clip(4 * heatmap_resized_np - 2, 0, 1)
    g = np.clip(1.5 - np.abs(4 * heatmap_resized_np - 2), 0, 1)
    b = np.clip(2 - 4 * heatmap_resized_np, 0, 1)
    color_heatmap = np.stack([r, g, b], axis=-1)
    
    img_np = np.array(img) / 255.0
    
    # Overlay heatmap (50% original, 50% heatmap) where heatmap values are > 0.05
    mask = heatmap_resized_np > 0.05
    overlay_np = img_np.copy()
    overlay_np[mask] = 0.5 * img_np[mask] + 0.5 * color_heatmap[mask]
    
    overlay_img = Image.fromarray((np.clip(overlay_np, 0, 1) * 255).astype(np.uint8))
    overlay_img.save(overlay_path)

@app.route('/')
def home():
    """Renders the unified healthcare-themed landing page (SPA)."""
    return render_template('index.html')

@app.route('/predict', methods=['GET', 'POST'])
def predict():
    """Handles GET requests (renders prediction UI) and POST requests (handles prediction)."""
    if request.method == 'GET':
        return render_template('predict.html')
        
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
        
    try:
        start_time = time.time()
        
        # Save file to uploads folder
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Preprocess the uploaded image
        img = Image.open(file_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img_resized = img.resize((128, 128))
        
        img_array = np.array(img_resized) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        # Inference
        model = get_model()
        predictions = model.predict(img_array)
        predicted_class_idx = int(np.argmax(predictions[0]))
        confidence_score = float(predictions[0][predicted_class_idx]) * 100
        predicted_class_name = CLASS_LABELS.get(predicted_class_idx, 'Unknown')
        
        # Calculate execution time
        inference_time = round((time.time() - start_time) * 1000, 2)  # milliseconds
        
        # Visual explainability check
        has_tumor = predicted_class_name != 'No Tumor'
        gradcam_filename = None
        
        if has_tumor:
            # Generate Grad-CAM image overlay
            gradcam_filename = f"gradcam_{filename}"
            gradcam_path = os.path.join(app.config['UPLOAD_FOLDER'], gradcam_filename)
            generate_gradcam(file_path, model, gradcam_path)
            
        return jsonify({
            'success': True,
            'prediction': predicted_class_name,
            'confidence': round(confidence_score, 2),
            'filename': filename,
            'gradcam_filename': gradcam_filename,
            'has_tumor': has_tumor,
            'inference_time_ms': inference_time
        })
        
    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/uploads/<filename>')
def serve_upload(filename):
    """Serves the uploaded and generated Grad-CAM images."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    # Attempt to load model once at startup to warm up
    try:
        get_model()
    except Exception as ex:
        print(f"Startup Warning: Could not load Keras model at start. Error: {ex}")
    
    app.run(host='127.0.0.1', port=5000, debug=True)
