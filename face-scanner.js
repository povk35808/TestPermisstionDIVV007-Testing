// --- File: face-scanner.js ---
// === VERSION 3: ប្រើ SsdMobilenetv1 (ដើម្បីភាពច្បាស់លាស់) តែលុបចោល Logic ស្មុគស្មាញ (ដើម្បីល្បឿន) ===

// --- Internal State & Constants ---
let userReferenceDescriptor = null;
let isFaceAnalysisRunning = false;
let lastFaceCheck = 0;
// ប្រើ 500ms សម្រាប់ SsdMobilenetv1 (តុល្យភាព Accuracy និង Performance)
const FACE_CHECK_INTERVAL = 500; 

/**
 * មុខងារសម្រាប់បិទ tracks របស់វីដេអូ (បិទកាមេរ៉ា)
 * @param {HTMLVideoElement} videoElement - ធាតុ <video>
 */
function stopVideoTracks(videoElement) {
    if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

/**
 * [EXPORT] ជម្រះ "កូនសោគោល" (Reference Descriptor) ដែលបានរក្សាទុក
 */
export function clearReferenceDescriptor() {
    userReferenceDescriptor = null;
    console.log("Reference Descriptor Cleared via module function.");
}

/**
 * [EXPORT] ទាញយក Face-API Models ពី CDN
 * @param {HTMLElement} modelStatusEl - ធាតុ <p> សម្រាប់បង្ហាញស្ថានភាព Model
 * @param {Function} onReadyCallback - Function ដែលត្រូវហៅ (call) ពេល Model រួចរាល់
 */
export async function loadFaceApiModels(modelStatusEl, onReadyCallback) {
    if (!modelStatusEl) return;
    try {
        // === កំពុងប្រើ Model ធ្ងន់ (SsdMobilenetv1) តាមការស្នើសុំ ===
        console.log("Loading face-api models (SsdMobilenetv1)...");
        modelStatusEl.textContent = 'កំពុងទាញយក Model ស្កេនមុខ...';
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'),
            faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'),
        ]);
        modelStatusEl.textContent = 'Model ស្កេនមុខបានទាញយករួចរាល់';
        console.log("Face-api models loaded successfully (SsdMobilenetv1).");
        if (onReadyCallback) onReadyCallback();
    } catch (error) {
        console.error("Error ពេលទាញយក Model របស់ face-api:", error);
        modelStatusEl.textContent = 'Error: មិនអាចទាញយក Model បាន';
    }
}

/**
 * [EXPORT] បង្កើត "កូនសោគោល" ពី URL រូបថតយោង
 * @param {string} userPhotoUrl - URL របស់រូបថត
 * @returns {faceapi.L2EuclideanDistance} - កូនសោគោល (Descriptor)
 */
export async function getReferenceDescriptor(userPhotoUrl) {
    if (userReferenceDescriptor) {
        console.log("Using cached reference descriptor.");
        return userReferenceDescriptor;
    }
    if (!userPhotoUrl) throw new Error("Missing user photo URL");

    console.log("Fetching and computing new reference descriptor (SsdMobilenetv1)...");
    let referenceImage;
    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = userPhotoUrl;
        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (err) => reject(new Error('Failed to fetch (មិនអាចទាញយករូបថតយោងបាន)។ សូមប្រាកដថា Link រូបថតត្រឹមត្រូវ។'));
        });
        referenceImage = img;
    } catch (fetchError) {
        throw fetchError;
    }

    let referenceDetection;
    try {
        // === កំពុងប្រើ Model ធ្ងន់ (SsdMobilenetv1) តាមការស្នើសុំ ===
        const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
        referenceDetection = await faceapi.detectSingleFace(referenceImage, options)
            .withFaceLandmarks(true)
            .withFaceDescriptor();
        if (!referenceDetection) throw new Error('រកមិនឃើញមុខនៅក្នុងរូបថតយោង');
    } catch (descriptorError) {
        console.error("Descriptor Error:", descriptorError);
        throw new Error('មិនអាចវិភាគមុខពីរូបថតយោងបានទេ (រូបថតអាចមិនច្បាស់)។');
    }
    userReferenceDescriptor = referenceDetection.descriptor;
    return userReferenceDescriptor;
}

/**
 * [EXPORT] បញ្ឈប់ Loop វិភាគផ្ទៃមុខ (rAF)
 */
export function stopAdvancedFaceAnalysis() {
    console.log("Stopping Advanced Face Analysis...");
    isFaceAnalysisRunning = false;
}

/**
 * [EXPORT] ចាប់ផ្តើមការវិភាគផ្ទៃមុខកម្រិតខ្ពស់ (ແບບសាមញ្ញ មិនគាំង)
 * @param {HTMLVideoElement} videoElement - ធាតុ <video>
 * @param {HTMLElement} statusElement - ធាតុ <p> សម្រាប់បង្ហាញសារ
 * @param {HTMLElement} debugElement - ធាតុ <p> សម្រាប់បង្ហាញ debug
 * @param {faceapi.L2EuclideanDistance} referenceDescriptor - "កូនសោគោល" សម្រាប់ប្រៀបធៀប
 * @param {Function} onSuccessCallback - Function ដែលត្រូវហៅ (call) នៅពេលផ្ទៀងផ្ទាត់ជោគជ័យ
 */
export function startAdvancedFaceAnalysis(videoElement, statusElement, debugElement, referenceDescriptor, onSuccessCallback) {
    console.log("Starting Advanced Face Analysis (Simplified, Non-Lagging)...");
    isFaceAnalysisRunning = true;
    lastFaceCheck = 0; // Reset ម៉ោងពិនិត្យចុងក្រោយ

    const VERIFICATION_THRESHOLD = 0.5; // 0.5 គឺល្អសម្រាប់ SsdMobilenetv1
    
    // === កំពុងប្រើ Model ធ្ងន់ (SsdMobilenetv1) តាមការស្នើសុំ ===
    const detectorOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

    // --- បង្កើត Loop ថ្មី ដោយប្រើ requestAnimationFrame ---
    async function analysisLoop(timestamp) {
        if (!isFaceAnalysisRunning) return; // បញ្ឈប់ Loop

        if (timestamp - lastFaceCheck < FACE_CHECK_INTERVAL) {
            requestAnimationFrame(analysisLoop);
            return;
        }
        lastFaceCheck = timestamp;

        try {
            if (!videoElement || videoElement.readyState < 3) {
                requestAnimationFrame(analysisLoop);
                return;
            }

            const detections = await faceapi.detectSingleFace(videoElement, detectorOptions)
                .withFaceLandmarks(true)
                .withFaceDescriptor();

            // === តក្កវិជ្ជាថ្មី (សាមញ្ញជាងមុន មិនគាំង) ===
            if (!detections) {
                // ករណីទី១៖ រកមិនឃើញមុខទាល់តែសោះ
                statusElement.textContent = 'រកមិនឃើញផ្ទៃមុខ...';
                debugElement.textContent = 'សូមដាក់មុខឲ្យចំរង្វង់'; // ការណែនាំតែមួយគត់
            } else {
                // ករណីទី២៖ រកឃើញមុខ -> ផ្ទៀងផ្ទាត់ភ្លាម!
                statusElement.textContent = 'រកឃើញ! កំពុងផ្ទៀងផ្ទាត់...';
                const distance = faceapi.euclideanDistance(referenceDescriptor, detections.descriptor);
                
                debugElement.textContent = `ចំងាយ: ${distance.toFixed(2)} (ត្រូវតែ < ${VERIFICATION_THRESHOLD})`;

                if (distance < VERIFICATION_THRESHOLD) {
                    // ជោគជ័យ
                    statusElement.textContent = 'ផ្ទៀងផ្ទាត់ជោគជ័យ!';
                    isFaceAnalysisRunning = false; // បញ្ឈប់ Loop
                    stopVideoTracks(videoElement); // បិទកាមេរ៉ា
                    onSuccessCallback(); // ហៅ Function ជោគជ័យ
                    return; // --- ចេញពី Loop ---
                } else {
                    // បរាជ័យ (មុខមិនត្រឹមត្រូវ)
                    statusElement.textContent = 'មុខមិនត្រឹមត្រូវ... កំពុងព្យាយាមម្តងទៀត';
                }
            }
            // === END ===
        
        } catch (error) {
            console.error("Error during face analysis rAF loop:", error);
            statusElement.textContent = 'មានបញ្ហាពេលវិភាគ...';
        }
        
        // បន្ត Loop ទៅ Frame បន្ទាប់
        requestAnimationFrame(analysisLoop);
    }

    // --- ចាប់ផ្តើម Loop ---
    requestAnimationFrame(analysisLoop);
}
