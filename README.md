# Brain Tumor Detection Using Deep Learning

## Overview

Brain Tumor Detection is a web-based application that uses Deep Learning to classify brain MRI scans into different tumor categories. The application is built using a fine-tuned VGG16 Convolutional Neural Network with TensorFlow/Keras and provides an intuitive interface for uploading MRI images and obtaining predictions in real time.

The application predicts whether an MRI scan belongs to one of the following classes:
* Glioma
* Meningioma
* No Tumor
* Pituitary Tumor
For tumor cases, the application also generates a Grad-CAM visualization to highlight the region of the MRI scan that most influenced the model's prediction.

---

## Features

* Upload MRI brain scan images.
* Real-time tumor prediction.
* Four-class classification.
* Confidence score for every prediction.
* Grad-CAM visualization for tumor localization.
* Responsive and modern web interface.
* Built using Flask and TensorFlow.
* Easy to deploy and extend.

---

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5

### Backend

* Python
* Flask

### Deep Learning

* TensorFlow
* Keras
* VGG16 Transfer Learning

### Libraries

* NumPy
* Pillow
* OpenCV
* Matplotlib
* Scikit-learn

---

## Model Architecture

The project uses a pre-trained VGG16 model with ImageNet weights.

* Input Size: 128 × 128 × 3
* Transfer Learning using VGG16
* Fine-tuned final convolutional layers
* Dense Layer (128 neurons, ReLU)
* Dropout for regularization
* Softmax output layer
* Adam Optimizer
* Sparse Categorical Crossentropy Loss

---

## Prediction Classes

| Class | Prediction |
| ----- | ---------- |
| 0     | Glioma     |
| 1     | Meningioma |
| 2     | No Tumor   |
| 3     | Pituitary  |

---

## Project Structure

```text
Brain_Tumor_Detection/
│
├── app.py
├── static/
│   ├── css/
│   ├── js/
│   └── images/
│
├── templates/
│   ├── base.html
│   ├── index.html
│   └── predict.html
│
├── models/
│   └── model.h5
│
├── uploads/
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Installation

Clone the repository.

```bash
git clone https://github.com/ShreyabindhuNellutla/Brain_Tumor_Detection.git
```

Open the project folder.

```bash
cd Brain_Tumor_Detection
```

Create a virtual environment.

```bash
python -m venv venv
```

Activate the virtual environment.

Windows

```bash
venv\Scripts\activate
```

Install the required packages.

```bash
pip install -r requirements.txt
```

Place the trained model inside the `models` folder as:

```text
models/model.h5
```

Run the application.

```bash
python app.py
```

Open your browser and visit:

```text
http://127.0.0.1:5000
```

---

## Dataset

The model is trained on a Brain MRI dataset containing four classes:

* Glioma
* Meningioma
* No Tumor
* Pituitary

---

## Results

* Overall Test Accuracy: **92%**
* Transfer Learning using VGG16
* Real-time prediction with confidence score
* Grad-CAM visualization for explainability

---

## Screenshots

Add screenshots of:

* Home Page
* MRI Upload Interface
* Prediction Result
* Grad-CAM Visualization

Example folder:

```text
screenshots/
```

---

## Future Improvements

* Improve model accuracy using EfficientNet or ResNet.
* Add support for DICOM images.
* Deploy the application on Render or Railway.
* Add patient report generation.
* Improve Grad-CAM visualization.
* Add user authentication and prediction history.

---

## Model File

The trained model (`models/model.h5`) is not included in this repository because it exceeds GitHub's file size limit.

To run the project, place the trained model inside the `models` folder before starting the application.

---

## Developer

**Shreyabindhu Nellutla**

Email: **[b23it025@kitsw.ac.in](mailto:b23it025@kitsw.ac.in)**

---

## License

This project is intended for educational and research purposes.
