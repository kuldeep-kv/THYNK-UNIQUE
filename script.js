 document.addEventListener('DOMContentLoaded', () => {

            // --- Element Selections ---
            const sosButton = document.getElementById('sosButton');
            const sosModal = document.getElementById('sosModal');
            const sosModalBody = document.getElementById('sosModalBody');

            const incidentForm = document.getElementById('incidentForm');
            const confirmationModal = document.getElementById('confirmationModal');
            const closeModalButtons = document.querySelectorAll('.close-modal, #closeModal');
            const referenceNumberSpan = document.getElementById('referenceNumber');

            const detectLocationBtn = document.getElementById('detectLocationBtn');
            const locationTextarea = document.getElementById('location');

            const formProgress = document.getElementById('formProgress');
            const progressPercentage = document.getElementById('progressPercentage');
            
            const accordionItems = document.querySelectorAll('.accordion-item');

            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const navLinks = document.getElementById('navLinks');

            const voiceAssistBtn = document.getElementById('voiceAssistBtn');
            const voiceStatus = document.getElementById('voiceStatus');
            
            // --- State Variables ---
            let isVoiceAssistActive = false;
            let hasInteracted = false; 

            // --- KAGGLE DATASET SAMPLE ---
            const emergencyServices = [
                // Chhattisgarh
                { "name": "District Hospital, Raipur", "type": "Hospital", "lat": 21.2379, "lon": 81.6337 },
                { "name": "Ramkrishna Care Hospital", "type": "Hospital", "lat": 21.2514, "lon": 81.6296 },
                { "name": "Kotwali Police Station, Raipur", "type": "Police", "lat": 21.2415, "lon": 81.6324 },
                { "name": "Civil Lines Police Station", "type": "Police", "lat": 21.2443, "lon": 81.6219 },
                // Delhi
                { "name": "AIIMS, New Delhi", "type": "Hospital", "lat": 28.5665, "lon": 77.2090 },
                { "name": "Safdarjung Hospital", "type": "Hospital", "lat": 28.5710, "lon": 77.2071 },
                { "name": "Connaught Place Police Station", "type": "Police", "lat": 28.6328, "lon": 77.2197 },
                // Mumbai
                { "name": "KEM Hospital", "type": "Hospital", "lat": 19.0090, "lon": 72.8420 },
                { "name": "Lilavati Hospital", "type": "Hospital", "lat": 19.0605, "lon": 72.8345 },
                { "name": "Dadar Police Station", "type": "Police", "lat": 19.0223, "lon": 72.8446 },
                // Bangalore
                { "name": "Victoria Hospital", "type": "Hospital", "lat": 12.9645, "lon": 77.5756 },
                { "name": "Manipal Hospital", "type": "Hospital", "lat": 12.9600, "lon": 77.6385 },
                { "name": "Cubbon Park Police Station", "type": "Police", "lat": 12.9778, "lon": 77.5929 }
            ];

            // --- 1. VOICE ASSISTANT (Web Speech API) ---
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            let recognition;

            const startVoiceAssist = () => {
                if (recognition && !isVoiceAssistActive) {
                    try {
                        recognition.start();
                        isVoiceAssistActive = true;
                        updateVoiceButtonUI();
                    } catch (e) {
                        console.error("Recognition start error:", e);
                        isVoiceAssistActive = false;
                        updateVoiceButtonUI();
                    }
                }
            };

            const stopVoiceAssist = () => {
                if (recognition && isVoiceAssistActive) {
                    recognition.stop();
                    isVoiceAssistActive = false;
                    updateVoiceButtonUI();
                }
            };
            
            const updateVoiceButtonUI = () => {
                if (isVoiceAssistActive) {
                    voiceAssistBtn.innerHTML = `<i class="fas fa-microphone-slash"></i> Turn OFF Voice Assist`;
                    voiceAssistBtn.classList.add('active');
                    voiceAssistBtn.classList.remove('off');
                    voiceStatus.textContent = 'Status: Listening...';
                } else {
                    voiceAssistBtn.innerHTML = `<i class="fas fa-microphone-alt"></i> Turn ON Voice Assist`;
                    voiceAssistBtn.classList.remove('active');
                    voiceAssistBtn.classList.add('off');
                    voiceStatus.textContent = 'Status: Idle';
                }
            };

            if (SpeechRecognition) {
                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event) => {
                    const transcript = event.results[event.resultIndex][0].transcript.toLowerCase().trim();
                    voiceStatus.textContent = `Heard: "${transcript}"`;
                    if (transcript.includes('help')) {
                        console.log('Keyword "help" detected! Triggering SOS.');
                        voiceStatus.textContent = `Status: "help" detected!`;
                        if (!sosModal.classList.contains('active')) {
                            sosButton.click();
                        }
                    }
                };
                
                recognition.onstart = () => {
                    console.log('Voice recognition started.');
                    voiceStatus.textContent = 'Status: Listening...';
                };

                recognition.onend = () => {
                    console.log('Voice recognition ended.');
                    if (isVoiceAssistActive) {
                        console.log('Restarting recognition...');
                        recognition.start();
                    }
                };

                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                        alert("Microphone permission was denied. Please allow it in your browser settings to use voice features.");
                        stopVoiceAssist();
                    }
                };

            } else {
                voiceAssistBtn.disabled = true;
                voiceStatus.textContent = 'Voice recognition not supported.';
            }

            voiceAssistBtn.addEventListener('click', () => {
                if (!hasInteracted) hasInteracted = true;
                
                if (isVoiceAssistActive) {
                    stopVoiceAssist();
                } else {
                    startVoiceAssist();
                }
            });

            const autoStartListener = () => {
                if (!hasInteracted && recognition) {
                    console.log("First user interaction detected. Activating voice assist.");
                    hasInteracted = true;
                    startVoiceAssist();
                    document.body.removeEventListener('click', autoStartListener);
                }
            };
            document.body.addEventListener('click', autoStartListener);
            
            updateVoiceButtonUI();

            // --- 2. SOS Emergency Logic ---
            const calculateDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371; // Radius of the Earth in km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                          Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c; // Distance in km
            }

            const findNearbyServices = (userLat, userLon) => {
                return emergencyServices
                    .map(service => ({
                        ...service,
                        distance: calculateDistance(userLat, userLon, service.lat, service.lon)
                    }))
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 5); // Get the 5 closest services
            };

            const runSOS = async () => {
                sosModal.classList.add('active');
                sosModalBody.innerHTML = `
                    <p class="sos-status">Contacting nearby services...</p>
                    <div class="spinner"></div>
                    <button class="cancel-sos-button" onclick="document.getElementById('sosModal').classList.remove('active')">Cancel</button>
                `;

                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
                    });

                    const { latitude, longitude } = position.coords;
                    console.log(`User location: ${latitude}, ${longitude}`);
                    sosModalBody.querySelector('.sos-status').textContent = 'Services found. Sending alert...';
                    
                    const nearby = findNearbyServices(latitude, longitude);

                    let servicesHTML = `
                        <div class="nearby-services">
                            <h4>Nearest Police Stations:</h4>
                            ${nearby.filter(s => s.type === 'Police').map(s => `
                                <div class="service-item">
                                    <i class="fas fa-building-shield"></i>
                                    <span>${s.name}</span>
                                    <span class="distance">${s.distance.toFixed(1)} km</span>
                                </div>`).join('') || '<p>No police stations found in the dataset.</p>'}
                            
                            <h4>Nearest Hospitals:</h4>
                             ${nearby.filter(s => s.type === 'Hospital').map(s => `
                                <div class="service-item">
                                    <i class="fas fa-hospital"></i>
                                    <span>${s.name}</span>
                                    <span class="distance">${s.distance.toFixed(1)} km</span>
                                </div>`).join('') || '<p>No hospitals found in the dataset.</p>'}
                        </div>
                    `;

                    setTimeout(() => {
                        sosModalBody.innerHTML = `
                            ${servicesHTML}
                            <div class="alert-sent">
                                <i class="fas fa-check-circle"></i> Alert sent to the services listed above!
                            </div>
                            <button class="cancel-sos-button" onclick="document.getElementById('sosModal').classList.remove('active')">Close</button>
                        `;
                        console.log("Alert sent to:", nearby);
                    }, 2000); // Simulate sending delay

                } catch (error) {
                    console.error("SOS Geolocation Error:", error.message, `(Code: ${error.code})`);
                    let errorMessage = "Could not get your location.";
                    if (error.code === 1) { // PERMISSION_DENIED
                        errorMessage = "Location permission denied.";
                    } else if (error.code === 2) { // POSITION_UNAVAILABLE
                        errorMessage = "Location information is unavailable.";
                    } else if (error.code === 3) { // TIMEOUT
                        errorMessage = "Location request timed out.";
                    }
                    
                    sosModalBody.innerHTML = `
                        <p class="sos-status" style="color: var(--secondary-color);">${errorMessage}</p>
                        <p>Please ensure location services are enabled in your browser and try again.</p>
                        <button class="cancel-sos-button" onclick="document.getElementById('sosModal').classList.remove('active')">Close</button>
                    `;
                }
            };
            
            sosButton.addEventListener('click', runSOS);


            // --- 3. Report Incident Form Logic ---
            incidentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const refNumber = `INC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                const formData = new FormData(incidentForm);
                console.log('%c--- New Incident Report Submitted ---', 'color: blue; font-size: 16px; font-weight: bold;');
                console.log('Reference Number:', refNumber);
                for (let [key, value] of formData.entries()) {
                    console.log(`${key}: ${value instanceof File ? `${value.name} (${value.size} bytes)` : value}`);
                }
                console.log('------------------------------------');
                referenceNumberSpan.textContent = refNumber;
                confirmationModal.classList.add('active');
                incidentForm.reset();
                updateProgressBar();
            });

            closeModalButtons.forEach(btn => btn.addEventListener('click', () => confirmationModal.classList.remove('active')));

            // --- 4. Form Completion Progress Bar ---
            const requiredInputs = Array.from(incidentForm.querySelectorAll('[required]'));
            function updateProgressBar() {
                const filledCount = requiredInputs.filter(input => input.type === 'checkbox' ? input.checked : input.value.trim() !== '').length;
                const percentage = requiredInputs.length > 0 ? (filledCount / requiredInputs.length) * 100 : 0;
                formProgress.style.width = `${percentage}%`;
                progressPercentage.textContent = `${Math.round(percentage)}%`;
            }
            incidentForm.addEventListener('input', updateProgressBar);

            // --- 5. Detect Location Button ---
            detectLocationBtn.addEventListener('click', () => {
                locationTextarea.value = "Detecting location...";
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        locationTextarea.value = `Detected Coordinates: Lat: ${position.coords.latitude.toFixed(5)}, Lng: ${position.coords.longitude.toFixed(5)}`;
                        updateProgressBar();
                    },
                    () => { locationTextarea.value = "Could not detect location. Please enter manually."; }
                );
            });

            // --- 6. Knowledge Center Accordion ---
            accordionItems.forEach(item => {
                const header = item.querySelector('.accordion-header');
                header.addEventListener('click', () => {
                    const isOpen = item.classList.contains('active');
                    accordionItems.forEach(otherItem => otherItem.classList.remove('active'));
                    if (!isOpen) item.classList.add('active');
                });
            });

            // --- 7. Mobile Menu ---
            mobileMenuBtn.addEventListener('click', () => navLinks.classList.toggle('active'));
        });
