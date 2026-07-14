document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadPlaceholderUi = document.getElementById('upload-placeholder-ui');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const clearPreviewBtn = document.getElementById('clear-preview');
    const fileInfo = document.getElementById('file-info');
    const predictBtn = document.getElementById('predict-btn');
    
    const placeholderContainer = document.getElementById('placeholder-container');
    const loadingContainer = document.getElementById('loading-container');
    const resultContainer = document.getElementById('result-container');
    
    const resultAlert = document.getElementById('result-alert');
    const resultAlertIcon = document.getElementById('result-alert-icon');
    const resultStatusTitle = document.getElementById('result-status-title');
    const resultStatusDesc = document.getElementById('result-status-desc');
    
    const resultTumor = document.getElementById('result-tumor');
    const resultConfidence = document.getElementById('result-confidence');
    const resultProgress = document.getElementById('result-progress');
    
    const visColOriginal = document.getElementById('vis-col-original');
    const visColGradcam = document.getElementById('vis-col-gradcam');
    const visImgOriginal = document.getElementById('vis-img-original');
    const visImgGradcam = document.getElementById('vis-img-gradcam');
    const visNoTumorMsg = document.getElementById('vis-no-tumor-msg');

    const pathologyExplanation = document.getElementById('pathology-explanation');
    const pathologySuggestions = document.getElementById('pathology-suggestions');
    
    const resetBtn = document.getElementById('reset-btn');

    let selectedFile = null;

    // Guard clause: Only run prediction page logic if workspace elements are present
    if (!dropZone) return;

    // Drag and Drop Event Listeners
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // Browse File Input Trigger & Change
    const browseBtn = dropZone.querySelector('button');
    if (browseBtn) {
        browseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    // File Selection Handlers
    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        
        // Accept only image files
        const allowedExtensions = /(\.jpg|\.jpeg|\.png)$/i;
        if (!allowedExtensions.exec(file.name) && !file.type.startsWith('image/')) {
            alert('Please upload an image file (.png, .jpg, or .jpeg).');
            return;
        }

        selectedFile = file;
        fileInfo.textContent = `${file.name} (${formatBytes(file.size)})`;

        // Render preview
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            uploadPlaceholderUi.classList.add('d-none');
            previewContainer.classList.remove('d-none');
            predictBtn.disabled = false;
        }
        reader.readAsDataURL(file);
    }

    // Clear Preview Action
    clearPreviewBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent file chooser trigger
        resetUploadForm();
    });

    function resetUploadForm() {
        selectedFile = null;
        fileInput.value = '';
        imagePreview.src = '#';
        fileInfo.textContent = '';
        previewContainer.classList.add('d-none');
        uploadPlaceholderUi.classList.remove('d-none');
        predictBtn.disabled = true;
    }

    // Predict Action (Fetch API Submission)
    predictBtn.addEventListener('click', function() {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        // UI State: Show Loading Spinner
        placeholderContainer.classList.add('d-none');
        resultContainer.classList.add('d-none');
        loadingContainer.classList.remove('d-none');
        predictBtn.disabled = true;
        clearPreviewBtn.disabled = true;

        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Server prediction error') });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayResults(data);
            } else {
                throw new Error(data.error || 'Prediction failed');
            }
        })
        .catch(error => {
            console.error('Error during inference:', error);
            alert(`Analysis Error: ${error.message}`);
            // Revert UI to input state
            loadingContainer.classList.add('d-none');
            placeholderContainer.classList.remove('d-none');
            predictBtn.disabled = false;
            clearPreviewBtn.disabled = false;
        });
    });

    // Medical Explanations and Guidelines database
    const classDetails = {
        'Glioma': {
            explanation: "Gliomas are primary brain tumors that originate in the supporting glial cells of the brain. They are characterized by their ability to infiltrate surrounding normal brain tissue, varying in aggressiveness from slow-growing low-grade to rapid high-grade forms (such as glioblastomas).",
            suggestions: [
                "Consult a neurologist or neuro-oncologist immediately for comprehensive medical evaluation.",
                "Schedule advanced diagnostic scans (such as contrast-enhanced MRI or MRS) to map tumor boundaries.",
                "Request a neurosurgical consultation to evaluate biopsy or tumor resection options.",
                "Refrain from self-treatment or self-diagnosis. Review symptoms and treatment options with medical specialists."
            ]
        },
        'Meningioma': {
            explanation: "Meningiomas arise from the meninges—the three protective membrane layers wrapping the brain and spinal cord. Most meningiomas are slow-growing and benign, though they can press against neural tissue or cranial nerves as they expand, causing localized symptoms.",
            suggestions: [
                "Schedule a consultation with a neurologist or neurosurgeon to discuss potential mass effect.",
                "Active surveillance (regular follow-up scans) is often recommended for small, asymptomatic tumors.",
                "Discuss surgical removal or radiation therapy if the meningioma is large or causing progressive neurological symptoms."
            ]
        },
        'Pituitary': {
            explanation: "Pituitary tumors develop in the pituitary gland, a vital organ located at the base of the brain regulating key body hormones. Most are benign adenomas but can disrupt hormone levels or compress the nearby optic chiasm, causing visual symptoms.",
            suggestions: [
                "Arrange a comprehensive blood panel with an endocrinologist to evaluate hormone hypersecretion or hyposecretion.",
                "Undergo a formal ophthalmology and visual field examination to check for pressure on the optic nerve.",
                "Consult a specialist neurosurgeon to evaluate options, including transsphenoidal endoscopic surgery."
            ]
        },
        'No Tumor': {
            explanation: "The deep learning VGG16 model classified this scan as showing no visual features of Glioma, Meningioma, or Pituitary tumors. The visible hemispheres, ventricles, and tissues align with normal anatomical baselines.",
            suggestions: [
                "Maintain standard preventive health checkups.",
                "If you are experiencing persistent neurological symptoms (such as chronic headaches, dizziness, or sensory deficits), consult a healthcare provider, as AI models serve only as preliminary screening aids.",
                "Have this scan reviewed by a board-certified radiologist for definitive clinical confirmation."
            ]
        }
    };

    // Display Results dynamically without page reload
    function displayResults(data) {
        loadingContainer.classList.add('d-none');
        resultContainer.classList.remove('d-none');
        predictBtn.disabled = false;
        clearPreviewBtn.disabled = false;

        // Set Text Outputs
        resultTumor.textContent = data.prediction;
        resultConfidence.textContent = `${data.confidence}%`;

        // Reset progress bar width
        resultProgress.style.width = '0%';
        
        // Remove previous alert and progress classes
        resultAlert.className = 'alert d-flex align-items-center rounded-3 p-3 mb-4';
        resultProgress.className = 'progress-bar progress-bar-striped progress-bar-animated rounded-pill';

        // Configure presentation based on specific prediction classes
        if (data.prediction === 'No Tumor') {
            // GREEN Alert Card
            resultAlert.classList.add('alert-notumor');
            resultAlertIcon.className = 'bi bi-check-circle-fill text-success fs-2 me-3';
            resultStatusTitle.textContent = 'No Tumor Detected';
            resultStatusDesc.textContent = 'Normal brain scan without anomalies. Healthy neural structure indicated.';
            resultProgress.classList.add('bg-notumor');
            
            // Visualization layout: Original image only
            visImgOriginal.src = `/uploads/${data.filename}`;
            visColOriginal.className = 'col-md-12 text-center';
            visColGradcam.classList.add('d-none');
            visNoTumorMsg.classList.remove('d-none');
        } else {
            // Tumor Detected (Glioma, Meningioma, Pituitary)
            visImgOriginal.src = `/uploads/${data.filename}`;
            visImgGradcam.src = `/uploads/${data.gradcam_filename}`;
            
            // Set layout to side-by-side columns
            visColOriginal.className = 'col-md-6 text-center';
            visColGradcam.classList.remove('d-none');
            visColGradcam.className = 'col-md-6 text-center';
            visNoTumorMsg.classList.add('d-none');

            if (data.prediction === 'Glioma') {
                // RED Alert Card
                resultAlert.classList.add('alert-glioma');
                resultAlertIcon.className = 'bi bi-exclamation-octagon-fill text-danger fs-2 me-3';
                resultStatusTitle.textContent = 'Tumor Detected: Glioma';
                resultStatusDesc.textContent = 'Abnormal glial tissue structure identified. SUSPICIOUS region mapped below.';
                resultProgress.classList.add('bg-glioma');
            } else if (data.prediction === 'Meningioma') {
                // ORANGE Alert Card
                resultAlert.classList.add('alert-meningioma');
                resultAlertIcon.className = 'bi bi-exclamation-triangle-fill text-warning fs-2 me-3';
                resultStatusTitle.textContent = 'Tumor Detected: Meningioma';
                resultStatusDesc.textContent = 'Pathological membranes growth detected. SUSPICIOUS region mapped below.';
                resultProgress.classList.add('bg-meningioma');
            } else if (data.prediction === 'Pituitary') {
                // PURPLE Alert Card
                resultAlert.classList.add('alert-pituitary');
                resultAlertIcon.className = 'bi bi-exclamation-circle-fill text-purple fs-2 me-3';
                resultStatusTitle.textContent = 'Tumor Detected: Pituitary';
                resultStatusDesc.textContent = 'Abnormal hormonal gland tissue growth detected. SUSPICIOUS region mapped below.';
                resultProgress.classList.add('bg-pituitary');
            }
        }

        // Render Pathology Details & Suggestions
        const details = classDetails[data.prediction] || classDetails['No Tumor'];
        pathologyExplanation.textContent = details.explanation;
        
        pathologySuggestions.innerHTML = '';
        details.suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.className = 'mb-1';
            li.textContent = suggestion;
            pathologySuggestions.appendChild(li);
        });
        
        // Trigger progress bar animation width update
        setTimeout(() => {
            resultProgress.style.width = `${data.confidence}%`;
            resultProgress.setAttribute('aria-valuenow', data.confidence);
        }, 100);
    }

    // Reset workspace elements
    resetBtn.addEventListener('click', function() {
        resetUploadForm();
        resultContainer.classList.add('d-none');
        placeholderContainer.classList.remove('d-none');
        visColGradcam.classList.add('d-none');
        visColOriginal.className = 'col-md-12 text-center';
        visNoTumorMsg.classList.add('d-none');
        pathologyExplanation.textContent = '';
        pathologySuggestions.innerHTML = '';
    });

    // Helper functions
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
