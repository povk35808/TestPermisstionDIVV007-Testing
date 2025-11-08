import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// នាំចូល (Import) ពី Modules ផ្សេងទៀត
import * as FaceScanner from './face-scanner.js';
import * as Utils from './utils.js';
// === NEW: នាំចូលពី requests.js ===
import * as Requests from './requests.js';

// Enable Firestore debug logging
setLogLevel('debug');

// --- Hard-coded Firebase Config ---
const firebaseConfig = { apiKey: "AIzaSyDjr_Ha2RxOWEumjEeSdluIW3JmyM76mVk", authDomain: "dipermisstion.firebaseapp.com", projectId: "dipermisstion", storageBucket: "dipermisstion.firebasestorage.app", messagingSenderId: "512999406057", appId: "1:512999406057:web:953a281ab9dde7a9a0f378", measurementId: "G-KDPHXZ7H4B" };

// --- Global State & Element References ---
let db, auth, userId;
let historyUnsubscribe = null, outHistoryUnsubscribe = null;
let approverPendingUnsubscribe = null, approverHistoryUnsubscribe = null;

let allUsersData = [], currentUser = null, selectedUserId = null;
let touchstartX = 0, touchendX = 0, isSwiping = false;
let selectedLeaveDuration = null;
let selectedLeaveReason = null;
let selectedOutDuration = null;
let selectedOutReason = null;

let pendingAlertTimer20s = null; 
let pendingAlertTimer50s = null; 
let pendingAlertTimer120s = null; 
let toastDisplayTimer = null;
let isEditing = false; // តាមដាន Edit Modal

let isApprover = false; 

// --- Google Sheet Config (Moved to Requests.js, but kept paths here) ---
let leaveRequestsCollectionPath, outRequestsCollectionPath;

// --- Element References ---
let userSearchInput, userDropdown, userSearchError, scanFaceBtn, modelStatusEl, faceScanModal, video, scanStatusEl, scanDebugEl, cancelScanBtn, loginFormContainer, inAppWarning, dataLoadingIndicator, rememberMeCheckbox, mainAppContainer, homeUserName, loginPage, bottomNav, userPhotoEl, userNameEl, userIdEl, userGenderEl, userGroupEl, userDepartmentEl, logoutBtn, navButtons, pages, mainContent, requestLeavePage, openLeaveRequestBtn, cancelLeaveRequestBtn, submitLeaveRequestBtn, leaveDurationSearchInput, leaveDurationDropdownEl, leaveSingleDateContainer, leaveDateRangeContainer, leaveSingleDateInput, leaveStartDateInput, leaveEndDateInput, leaveRequestErrorEl, leaveRequestLoadingEl, leaveReasonSearchInput, leaveReasonDropdownEl, historyContainer, historyPlaceholder, criticalErrorDisplay, historyTabLeave, historyTabOut, historyContainerLeave, historyContainerOut, historyPlaceholderLeave, historyPlaceholderOut, historyContent, editModal, editModalTitle, editForm, editRequestId, editDurationSearchInput, editDurationDropdownEl, editSingleDateContainer, editLeaveDateSingle, editDateRangeContainer, editLeaveDateStart, editLeaveDateEnd, editReasonSearchInput, editReasonDropdownEl, editErrorEl, editLoadingEl, submitEditBtn, cancelEditBtn, deleteModal, deleteConfirmBtn, cancelDeleteBtn, deleteRequestId, deleteCollectionType, openOutRequestBtn, requestOutPage, cancelOutRequestBtn, submitOutRequestBtn, outRequestErrorEl, outRequestLoadingEl, outDurationSearchInput, outDurationDropdownEl, outReasonSearchInput, outReasonDropdownEl, outDateInput, returnScanModal, returnVideo, returnScanStatusEl, returnScanDebugEl, cancelReturnScanBtn, customAlertModal, customAlertTitle, customAlertMessage, customAlertOkBtn, customAlertIconWarning, customAlertIconSuccess, invoiceModal, closeInvoiceModalBtn, invoiceModalTitle, invoiceContentWrapper, invoiceContent, invoiceUserName, invoiceUserId, invoiceUserDept, invoiceRequestType, invoiceDuration, invoiceDates, invoiceReason, invoiceStatus, invoiceApprover, invoiceDecisionTime, invoiceRequestId, invoiceReturnInfo, invoiceReturnStatus, invoiceReturnTime, shareInvoiceBtn, invoiceShareStatus, pendingStatusAlert, pendingStatusMessage;

// === NEW ANNOUNCEMENT ELEMENTS ===
let announcementModal, announcementMessage, announcementCloseBtn;

// === NEW AGREEMENT ELEMENTS ===
let agreementModal, agreementTitle, agreementMessage, agreementCheckbox, agreementAgreeBtn, agreementCancelBtn;

// === NEW APPROVER ELEMENTS ===
let openApproverDashboardBtn, approverSection, closeApproverDashboardBtn, approverTabPending, approverTabHistory, approverContainerPending, approverContainerHistory, pendingCountEl;

// --- Duration/Reason Constants ---
const leaveDurations = ["មួយព្រឹក", "មួយរសៀល", "មួយយប់", "មួយថ្ងៃ", "មួយថ្ងៃកន្លះ", "ពីរថ្ងៃ", "ពីរថ្ងៃកន្លះ", "បីថ្ងៃ", "បីថ្ងៃកន្លះ", "បួនថ្ងៃ", "បួនថ្ងៃកន្លះ", "ប្រាំថ្ងៃ", "ប្រាំថ្ងៃកន្លះ", "ប្រាំមួយថ្ងៃ", "ប្រាំមួយថ្ងៃកន្លះ", "ប្រាំពីរថ្ងៃ"]; const leaveDurationItems = leaveDurations.map(d => ({ text: d, value: d })); const leaveReasons = ["ឈឺក្បាល", "ចុកពោះ", "គ្រុនក្ដៅ", "ផ្ដាសាយ"]; const leaveReasonItems = leaveReasons.map(r => ({ text: r, value: r })); const singleDayLeaveDurations = ["មួយព្រឹក", "មួយរសៀល", "មួយយប់", "មួយថ្ងៃ"]; const outDurations = ["មួយព្រឹក", "មួយរសៀល", "មួយថ្ងៃ"]; const outDurationItems = outDurations.map(d => ({ text: d, value: d })); const outReasons = ["ទៅផ្សារ", "ទៅកាត់សក់", "ទៅភ្នំពេញ", "ទៅពេទ្យ", "ទៅយកអីវ៉ាន់"]; const outReasonItems = outReasons.map(r => ({ text: r, value: r })); const durationToDaysMap = { "មួយថ្ងៃកន្លះ": 1.5, "ពីរថ្ងៃ": 2, "ពីរថ្ងៃកន្លះ": 2.5, "បីថ្ងៃ": 3, "បីថ្ងៃកន្លះ": 3.5, "បួនថ្ងៃ": 4, "បួនថ្ងៃកន្លះ": 4.5, "ប្រាំថ្ងៃ": 5, "ប្រាំថ្ងៃកន្លះ": 5.5, "ប្រាំមួយថ្ងៃ": 6, "ប្រាំមួយថ្ងៃកន្លះ": 6.5, "ប្រាំពីរថ្ងៃ": 7 };

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {

    // --- Assign Element References ---
    userSearchInput = document.getElementById('user-search'); userDropdown = document.getElementById('user-dropdown'); userSearchError = document.getElementById('user-search-error'); scanFaceBtn = document.getElementById('scan-face-btn'); modelStatusEl = document.getElementById('model-status'); faceScanModal = document.getElementById('face-scan-modal'); video = document.getElementById('video'); scanStatusEl = document.getElementById('scan-status'); scanDebugEl = document.getElementById('scan-debug'); cancelScanBtn = document.getElementById('cancel-scan-btn'); loginFormContainer = document.getElementById('login-form-container'); inAppWarning = document.getElementById('in-app-warning'); dataLoadingIndicator = document.getElementById('data-loading-indicator'); rememberMeCheckbox = document.getElementById('remember-me'); mainAppContainer = document.getElementById('main-app-container'); homeUserName = document.getElementById('home-user-name'); loginPage = document.getElementById('page-login'); bottomNav = document.getElementById('bottom-navigation'); userPhotoEl = document.getElementById('user-photo'); userNameEl = document.getElementById('user-name'); userIdEl = document.getElementById('user-id'); userGenderEl = document.getElementById('user-gender'); userGroupEl = document.getElementById('user-group'); userDepartmentEl = document.getElementById('user-department'); logoutBtn = document.getElementById('logout-btn'); navButtons = document.querySelectorAll('.nav-btn');
    mainContent = document.getElementById('main-content'); criticalErrorDisplay = document.getElementById('critical-error-display'); requestLeavePage = document.getElementById('page-request-leave'); openLeaveRequestBtn = document.getElementById('open-leave-request-btn'); cancelLeaveRequestBtn = document.getElementById('cancel-leave-request-btn'); submitLeaveRequestBtn = document.getElementById('submit-leave-request-btn'); leaveDurationSearchInput = document.getElementById('leave-duration-search'); leaveDurationDropdownEl = document.getElementById('leave-duration-dropdown'); leaveSingleDateContainer = document.getElementById('leave-single-date-container'); leaveDateRangeContainer = document.getElementById('leave-date-range-container'); leaveSingleDateInput = document.getElementById('leave-date-single'); leaveStartDateInput = document.getElementById('leave-date-start'); leaveEndDateInput = document.getElementById('leave-date-end'); leaveRequestErrorEl = document.getElementById('leave-request-error'); leaveRequestLoadingEl = document.getElementById('leave-request-loading'); leaveReasonSearchInput = document.getElementById('leave-reason-search'); leaveReasonDropdownEl = document.getElementById('leave-reason-dropdown');
    
    // History Elements
    historyContent = document.getElementById('history-content');
    historyTabLeave = document.getElementById('history-tab-leave'); 
    historyTabOut = document.getElementById('history-tab-out'); 
    historyContainerLeave = document.getElementById('history-container-leave'); 
    historyContainerOut = document.getElementById('history-container-out'); 
    historyPlaceholderLeave = document.getElementById('history-placeholder-leave'); 
    historyPlaceholderOut = document.getElementById('history-placeholder-out'); 
    
    // Edit/Delete Elements
    editModal = document.getElementById('edit-modal'); editModalTitle = document.getElementById('edit-modal-title'); editForm = document.getElementById('edit-form'); editRequestId = document.getElementById('edit-request-id'); editDurationSearchInput = document.getElementById('edit-duration-search'); editDurationDropdownEl = document.getElementById('edit-duration-dropdown'); editSingleDateContainer = document.getElementById('edit-single-date-container'); editLeaveDateSingle = document.getElementById('edit-leave-date-single'); editDateRangeContainer = document.getElementById('edit-date-range-container'); editLeaveDateStart = document.getElementById('edit-leave-date-start'); editLeaveDateEnd = document.getElementById('edit-leave-date-end'); editReasonSearchInput = document.getElementById('edit-reason-search'); editReasonDropdownEl = document.getElementById('edit-reason-dropdown'); editErrorEl = document.getElementById('edit-error'); editLoadingEl = document.getElementById('edit-loading'); submitEditBtn = document.getElementById('submit-edit-btn'); cancelEditBtn = document.getElementById('cancel-edit-btn'); deleteModal = document.getElementById('delete-modal'); deleteConfirmBtn = document.getElementById('delete-confirm-btn'); cancelDeleteBtn = document.getElementById('cancel-delete-btn'); deleteRequestId = document.getElementById('delete-request-id'); deleteCollectionType = document.getElementById('delete-collection-type'); 
    
    // Out Request Elements
    openOutRequestBtn = document.getElementById('open-out-request-btn'); requestOutPage = document.getElementById('page-request-out'); cancelOutRequestBtn = document.getElementById('cancel-out-request-btn'); submitOutRequestBtn = document.getElementById('submit-out-request-btn'); outRequestErrorEl = document.getElementById('out-request-error'); outRequestLoadingEl = document.getElementById('out-request-loading'); outDurationSearchInput = document.getElementById('out-duration-search'); outDurationDropdownEl = document.getElementById('out-duration-dropdown'); outReasonSearchInput = document.getElementById('out-reason-search'); outReasonDropdownEl = document.getElementById('out-reason-dropdown'); outDateInput = document.getElementById('out-date-single'); 
    
    // Return Scan Elements
    returnScanModal = document.getElementById('return-scan-modal'); returnVideo = document.getElementById('return-video'); returnScanStatusEl = document.getElementById('return-scan-status'); returnScanDebugEl = document.getElementById('return-scan-debug'); cancelReturnScanBtn = document.getElementById('cancel-return-scan-btn'); 
    
    // Modal Elements
    customAlertModal = document.getElementById('custom-alert-modal'); customAlertTitle = document.getElementById('custom-alert-title'); customAlertMessage = document.getElementById('custom-alert-message'); customAlertOkBtn = document.getElementById('custom-alert-ok-btn'); customAlertIconWarning = document.getElementById('custom-alert-icon-warning'); customAlertIconSuccess = document.getElementById('custom-alert-icon-success'); 
    invoiceModal = document.getElementById('invoice-modal'); closeInvoiceModalBtn = document.getElementById('close-invoice-modal-btn'); invoiceModalTitle = document.getElementById('invoice-modal-title'); invoiceContentWrapper = document.getElementById('invoice-content-wrapper'); invoiceContent = document.getElementById('invoice-content'); invoiceUserName = document.getElementById('invoice-user-name'); invoiceUserId = document.getElementById('invoice-user-id'); invoiceUserDept = document.getElementById('invoice-user-dept'); invoiceRequestType = document.getElementById('invoice-request-type'); invoiceDuration = document.getElementById('invoice-duration'); invoiceDates = document.getElementById('invoice-dates'); invoiceReason = document.getElementById('invoice-reason'); invoiceStatus = document.getElementById('invoice-status'); invoiceApprover = document.getElementById('invoice-approver'); invoiceDecisionTime = document.getElementById('invoice-decision-time'); invoiceRequestId = document.getElementById('invoice-request-id'); invoiceReturnInfo = document.getElementById('invoice-return-info'); invoiceReturnStatus = document.getElementById('invoice-return-status'); invoiceReturnTime = document.getElementById('invoice-return-time'); shareInvoiceBtn = document.getElementById('share-invoice-btn'); invoiceShareStatus = document.getElementById('invoice-share-status');
    pendingStatusAlert = document.getElementById('pending-status-alert');
    pendingStatusMessage = document.getElementById('pending-status-message');
    
    // === NEW APPROVER ELEMENTS ===
    openApproverDashboardBtn = document.getElementById('open-approver-dashboard-btn');
    approverSection = document.getElementById('approver-section');
    closeApproverDashboardBtn = document.getElementById('close-approver-dashboard-btn');
    approverTabPending = document.getElementById('approver-tab-pending');
    approverTabHistory = document.getElementById('approver-tab-history');
    approverContainerPending = document.getElementById('approver-container-pending');
    approverContainerHistory = document.getElementById('approver-container-history');
    pendingCountEl = document.getElementById('pending-count');
    
    // === NEW ANNOUNCEMENT ELEMENTS ===
    announcementModal = document.getElementById('announcement-modal');
    announcementMessage = document.getElementById('announcement-message');
    announcementCloseBtn = document.getElementById('announcement-close-btn');

    // === NEW AGREEMENT ELEMENTS ===
    agreementModal = document.getElementById('agreement-modal');
    agreementTitle = document.getElementById('agreement-title');
    agreementMessage = document.getElementById('agreement-message');
    agreementCheckbox = document.getElementById('agreement-checkbox');
    agreementAgreeBtn = document.getElementById('agreement-agree-btn');
    agreementCancelBtn = document.getElementById('agreement-cancel-btn');
    
    // === MODIFIED: REMOVED 'page-daily-attendance' ===
    pages = ['page-home', 'page-history', 'page-account', 'page-help', 'page-request-leave', 'page-request-out', 'page-approver']; 
    
    // --- Global Event Listeners ---
    if (customAlertOkBtn) customAlertOkBtn.addEventListener('click', hideCustomAlert);
    if (closeInvoiceModalBtn) closeInvoiceModalBtn.addEventListener('click', () => Requests.hideInvoiceModal(invoiceModal, invoiceShareStatus, shareInvoiceBtn));
    if (shareInvoiceBtn) shareInvoiceBtn.addEventListener('click', ()=> Requests.shareInvoiceAsImage(invoiceContent, invoiceContentWrapper, shareInvoiceBtn, invoiceShareStatus, showCustomAlert));
    
    // === NEW: Announcement Listener (MODIFIED to not use localStorage) ===
    if (announcementCloseBtn) {
        announcementCloseBtn.addEventListener('click', () => {
            if (announcementModal) announcementModal.classList.add('hidden');
        });
    }
    // === END: NEW Announcement Listener ===
    
    // === NEW: Agreement Modal Listeners ===
    if (agreementCancelBtn) {
        agreementCancelBtn.addEventListener('click', () => {
            if (agreementModal) agreementModal.classList.add('hidden');
        });
    }
    if (agreementCheckbox) {
        agreementCheckbox.addEventListener('change', () => {
            if (agreementAgreeBtn) {
                agreementAgreeBtn.disabled = !agreementCheckbox.checked;
            }
        });
    }
    if (agreementAgreeBtn) {
        agreementAgreeBtn.addEventListener('click', () => {
            const type = agreementAgreeBtn.dataset.type;
            if (agreementModal) agreementModal.classList.add('hidden');
            
            if (type === 'leave') {
                openLeaveForm(); // ហៅ Function ថ្មី
            } else if (type === 'out') {
                openOutForm(); // ហៅ Function ថ្មី
            }
        });
    }
    // === END: NEW Agreement Modal Listeners ===

    // === MODIFIED: History Page Listeners (Moved Tap Handler to Requests.js) ===
    if (historyContent) { 
        historyContent.addEventListener('touchstart', handleTouchStart, false); 
        historyContent.addEventListener('touchmove', handleTouchMove, false); 
        historyContent.addEventListener('touchend', handleTouchEnd, false); 
    }
    const historyTapHandler = (event) => Requests.handleHistoryTap(event, db, outRequestsCollectionPath, openEditModal, openDeleteModal, startReturnConfirmation, openInvoiceModal);
    if (historyContainerLeave) historyContainerLeave.addEventListener('touchstart', historyTapHandler, { passive: false });
    if (historyContainerOut) historyContainerOut.addEventListener('touchstart', historyTapHandler, { passive: false });

    // --- Setup Dropdowns AFTER elements are available ---
    setupSearchableDropdown('user-search', 'user-dropdown', [], (id) => { 
        selectedUserId = id;
        FaceScanner.clearReferenceDescriptor(); 
        console.log("Reference Descriptor Cleared on User Select.");
        if (scanFaceBtn) scanFaceBtn.disabled = (id === null || !modelStatusEl || modelStatusEl.textContent !== 'Model ស្កេនមុខបានទាញយករួចរាល់');
        console.log("Selected User ID:", selectedUserId);
    });
    
    // === MODIFIED Dropdowns to include validation ===
    setupSearchableDropdown('leave-duration-search', 'leave-duration-dropdown', leaveDurationItems, (duration) => { 
        selectedLeaveDuration = duration; 
        updateLeaveDateFields(duration); 
        validateLeaveForm(); // <-- ADDED
    }, false);
    setupSearchableDropdown('leave-reason-search', 'leave-reason-dropdown', leaveReasonItems, (reason) => { 
        selectedLeaveReason = reason; 
        validateLeaveForm(); // <-- ADDED
    }, true);
    setupSearchableDropdown('out-duration-search', 'out-duration-dropdown', outDurationItems, (duration) => { 
        selectedOutDuration = duration; 
        validateOutForm(); // <-- ADDED
    }, false);
    setupSearchableDropdown('out-reason-search', 'out-reason-dropdown', outReasonItems, (reason) => { 
        selectedOutReason = reason; 
        validateOutForm(); // <-- ADDED
    }, true);
    // === END MODIFIED Dropdowns ===

    setupSearchableDropdown('edit-duration-search', 'edit-duration-dropdown', [], () => {}, false); 
    setupSearchableDropdown('edit-reason-search', 'edit-reason-dropdown', [], () => {}, true);

    // --- Firebase Initialization & Auth ---
    try { 
        if (!firebaseConfig.projectId) throw new Error("projectId not provided in firebase.initializeApp."); 
        console.log("Initializing Firebase with Config:", firebaseConfig); 
        const app = initializeApp(firebaseConfig); 
        db = getFirestore(app); 
        auth = getAuth(app); 
        const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; 
        leaveRequestsCollectionPath = `/artifacts/${canvasAppId}/public/data/leave_requests`; 
        outRequestsCollectionPath = `/artifacts/${canvasAppId}/public/data/out_requests`; 
        console.log("Using Firestore Leave Path:", leaveRequestsCollectionPath); 
        console.log("Using Firestore Out Path:", outRequestsCollectionPath); 
        
        // Pass paths to Requests module
        Requests.setCollectionPaths(leaveRequestsCollectionPath, outRequestsCollectionPath);
        
        onAuthStateChanged(auth, (user) => { 
            if (user) { 
                console.log("Firebase Auth state changed. User UID:", user.uid); 
                userId = user.uid; 
                function isClient() { const ua = navigator.userAgent || navigator.vendor || window.opera; return ( (ua.indexOf('FBAN') > -1) || (ua.indexOf('FBAV') > -1) || (ua.indexOf('Twitter') > -1) || (ua.indexOf('Telegram') > -1) || (ua.indexOf('WebView') > -1) || (ua.indexOf('wv') > -1) ); } 
                if (isClient()) { 
                    console.log("Detected In-App Browser."); 
                    if (inAppWarning) inAppWarning.classList.remove('hidden'); 
                    if (modelStatusEl) modelStatusEl.textContent = 'សូមបើកក្នុង Browser ពេញលេញ'; 
                    if (dataLoadingIndicator) dataLoadingIndicator.classList.add('hidden'); 
                } else { 
                    console.log("Detected Full Browser."); 
                    if (inAppWarning) inAppWarning.classList.add('hidden'); 
                    if (typeof faceapi !== 'undefined') { 
                        if (scanFaceBtn) scanFaceBtn.disabled = true;
                        FaceScanner.loadFaceApiModels(modelStatusEl, () => {
                            if (scanFaceBtn) scanFaceBtn.disabled = (selectedUserId === null);
                        });
                    } else { 
                        console.error("Face-API.js មិនអាចទាញយកបានត្រឹមត្រូវទេ។"); 
                        if (modelStatusEl) modelStatusEl.textContent = 'Error: មិនអាចទាញយក Library ស្កេនមុខបាន'; 
                    } 
                    const rememberedUser = localStorage.getItem('leaveAppUser'); 
                    if (rememberedUser) { 
                        try { 
                            const parsedUser = JSON.parse(rememberedUser); 
                            if (parsedUser && parsedUser.id) { 
                                console.log("Found remembered user:", parsedUser.id); 
                                currentUser = parsedUser; 
                                showLoggedInState(parsedUser); 
                                fetchUsers(); // Fetch users in background
                                return; 
                            } 
                        } catch (e) { 
                            localStorage.removeItem('leaveAppUser'); 
                        } 
                    } 
                    console.log("No remembered user found, starting normal app flow."); 
                    initializeAppFlow(); 
                } 
            } else { 
                console.log("Firebase Auth: No user signed in. Attempting anonymous sign-in..."); 
                signInAnonymously(auth).catch(anonError => { 
                    console.error("Error during automatic anonymous sign-in attempt:", anonError); 
                    if (criticalErrorDisplay) { 
                        criticalErrorDisplay.classList.remove('hidden'); 
                        criticalErrorDisplay.textContent = `Critical Error: មិនអាច Sign In បានទេ។ ${anonError.message}។ សូម Refresh ម្ដងទៀត។`; 
                    } 
                }); 
            } 
        }); 
        
        try { 
            console.log("Attempting initial Anonymous Sign-In..."); 
            await signInAnonymously(auth); 
            console.log("Firebase Auth: Initial Anonymous Sign-In successful (or already signed in)."); 
        } catch (e) { 
            console.error("Initial Anonymous Sign-In Error:", e); 
            if (e.code === 'auth/operation-not-allowed') { 
                throw new Error("សូមបើក 'Anonymous' sign-in នៅក្នុង Firebase Console។"); 
            } 
            throw new Error(`Firebase Sign-In Error: ${e.message}`); 
        } 
    } catch (e) { 
        console.error("Firebase Initialization/Auth Error:", e); 
        if(criticalErrorDisplay) { 
            criticalErrorDisplay.classList.remove('hidden'); 
            criticalErrorDisplay.textContent = `Critical Error: មិនអាចតភ្ជាប់ Firebase បានទេ។ ${e.message}។ សូម Refresh ម្ដងទៀត។`; 
        } 
        if(loginPage) loginPage.classList.add('hidden'); 
    }
// --- Main App Logic ---
    function initializeAppFlow() { 
        console.log("initializeAppFlow called (for non-remembered user)."); 
        console.log("Fetching users for initial login..."); 
        if (dataLoadingIndicator) dataLoadingIndicator.classList.remove('hidden'); 
        fetchUsers(); 
    }
    
    async function fetchUsers() { 
        console.log("Fetching users from Google Sheet..."); 
        try { 
            const response = await fetch(Requests.GVIZ_URL); 
            if (!response.ok) throw new Error(`Google Sheet fetch failed: ${response.status}`); 
            const text = await response.text(); 
            const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s); 
            if (!match || !match[1]) throw new Error("ទម្រង់ការឆ្លើយតបពី Google Sheet មិនត្រឹមត្រូវ"); 
            const json = JSON.parse(match[1]); 
            if (json.table && json.table.rows && json.table.rows.length > 0) { 
                allUsersData = json.table.rows.map(row => ({ id: row.c?.[0]?.v ?? null, name: row.c?.[1]?.v ?? null, photo: row.c?.[2]?.v ?? null, gender: row.c?.[3]?.v ?? null, group: row.c?.[4]?.v ?? null, department: row.c?.[5]?.v ?? null })); 
                console.log(`Fetched ${allUsersData.length} users.`);
                populateUserDropdown(allUsersData, 'user-search', 'user-dropdown', (id) => { 
                    selectedUserId = id; 
                    FaceScanner.clearReferenceDescriptor();
                    console.log("Reference Descriptor Cleared on populateUserDropdown.");
                    if (scanFaceBtn) scanFaceBtn.disabled = (id === null || !modelStatusEl || modelStatusEl.textContent !== 'Model ស្កេនមុខបានទាញយករួចរាល់'); 
                    console.log("Selected User ID:", selectedUserId); 
                });
                if (dataLoadingIndicator) dataLoadingIndicator.classList.add('hidden'); 
                if (loginFormContainer) loginFormContainer.classList.remove('hidden'); 
            } else { 
                throw new Error("រកមិនឃើញទិន្នន័យអ្នកប្រើប្រាស់"); 
            } 
        } catch (error) { 
            console.error("Error ពេលទាញយកទិន្នន័យ Google Sheet:", error); 
            if (dataLoadingIndicator) { 
                dataLoadingIndicator.innerHTML = `<p class="text-red-600 font-semibold">Error: មិនអាចទាញយកទិន្នន័យបាន</p><p class="text-gray-600 text-sm mt-1">សូមពិនិត្យអ៊ីនធឺណិត និង Refresh ម្ដងទៀត។</p>`; 
                dataLoadingIndicator.classList.remove('hidden'); 
            } 
        } 
    }

    // --- Reusable Searchable Dropdown Logic (Performance Fix) ---
    function setupSearchableDropdown(inputId, dropdownId, items, onSelectCallback, allowCustom = false) {
        const searchInput = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!searchInput || !dropdown) {
            console.error(`Dropdown elements not found: inputId=${inputId}, dropdownId=${dropdownId}`);
            return;
        }
        
        const MAX_RESULTS_TO_SHOW = 20;

        function populateDropdown(filter = '') {
            dropdown.innerHTML = '';
            const filterLower = filter.toLowerCase();

            if (filterLower === '' && inputId === 'user-search') {
                const itemEl = document.createElement('div');
                itemEl.textContent = `សូមវាយ ID ឬ ឈ្មោះ (ទិន្នន័យសរុប ${items.length} នាក់)`;
                itemEl.className = 'px-4 py-2 text-gray-500 text-sm italic';
                dropdown.appendChild(itemEl);
                dropdown.classList.remove('hidden');
                return;
            }

            const filteredItems = items.filter(item => item.text && item.text.toLowerCase().includes(filterLower));

            if (filteredItems.length === 0) {
                if (filterLower !== '' || (filterLower === '' && inputId !== 'user-search')) {
                    const itemEl = document.createElement('div');
                    itemEl.textContent = 'រកមិនឃើញ...';
                    itemEl.className = 'px-4 py-2 text-gray-500 text-sm italic';
                    dropdown.appendChild(itemEl);
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.classList.add('hidden');
                }
                return;
            }
            
            const itemsToShow = filteredItems.slice(0, MAX_RESULTS_TO_SHOW);

            itemsToShow.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.textContent = item.text;
                itemEl.dataset.value = item.value;
                itemEl.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm';
                itemEl.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    searchInput.value = item.text;
                    dropdown.classList.add('hidden');
                    if (onSelectCallback) onSelectCallback(item.value);
                    console.log(`Selected dropdown item: ${item.text} (value: ${item.value})`);
                });
                dropdown.appendChild(itemEl);
            });

            if (filteredItems.length > MAX_RESULTS_TO_SHOW) {
                const moreEl = document.createElement('div');
                moreEl.textContent = `... និង ${filteredItems.length - MAX_RESULTS_TO_SHOW} ផ្សេងទៀត`;
                moreEl.className = 'px-4 py-2 text-gray-400 text-xs italic';
                dropdown.appendChild(moreEl);
            }

            dropdown.classList.remove('hidden');
        }

        searchInput.addEventListener('input', () => {
            const currentValue = searchInput.value;
            populateDropdown(currentValue);
            const exactMatch = items.find(item => item.text === currentValue);
            const selection = exactMatch ? exactMatch.value : (allowCustom ? currentValue : null);
            if (onSelectCallback) onSelectCallback(selection);
        });

        searchInput.addEventListener('focus', () => {
            populateDropdown(searchInput.value);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                dropdown.classList.add('hidden');
                const currentValue = searchInput.value;
                const validItem = items.find(item => item.text === currentValue);
                if (validItem) {
                    if (onSelectCallback) onSelectCallback(validItem.value);
                } else if (allowCustom && currentValue.trim() !== '') {
                    if (onSelectCallback) onSelectCallback(currentValue);
                } else if (inputId !== 'user-search') {
                    console.log(`Invalid selection on ${inputId}: ${currentValue}`);
                    if (onSelectCallback) onSelectCallback(null);
                }
            }, 150);
        });
    }
    function populateUserDropdown(users, inputId, dropdownId, onSelectCallback) { const userItems = users.filter(user => user.id && user.name).map(user => ({ text: `${user.id} - ${user.name}`, value: user.id })); setupSearchableDropdown(inputId, dropdownId, userItems, onSelectCallback, false); }

    // --- Face Scan Logic ---
    async function startFaceScan() { 
        console.log("startFaceScan called."); 
        if (!selectedUserId) { 
            showCustomAlert("Error", "សូមជ្រើសរើសអត្តលេខរបស់អ្នកជាមុនសិន"); 
            return; 
        } 
        const user = allUsersData.find(u => u.id === selectedUserId); 
        if (!user || !user.photo) { 
            showCustomAlert("Error", "មិនអាចទាញយករូបថតយោងរបស់អ្នកបានទេ។ សូមទាក់ទង IT Support។"); 
            return; 
        } 
        if (faceScanModal) faceScanModal.classList.remove('hidden'); 
        if (scanStatusEl) scanStatusEl.textContent = 'កំពុងព្យាយាមបើកកាមេរ៉ា...'; 
        
        try { 
            if (scanStatusEl) scanStatusEl.textContent = 'កំពុងវិភាគរូបថតយោង...';
            const referenceDescriptor = await FaceScanner.getReferenceDescriptor(user.photo); 
            if (scanStatusEl) scanStatusEl.textContent = 'កំពុងស្នើសុំបើកកាមេរ៉ា...'; 
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} }); 

            if (video) video.srcObject = stream; 
            if (scanStatusEl) scanStatusEl.textContent = 'សូមដាក់មុខរបស់អ្នកឲ្យចំកាមេរ៉ា'; 
            
            FaceScanner.stopAdvancedFaceAnalysis(); 

            const onSuccess = () => {
                console.log("Login Scan Success!");
                loginUser(selectedUserId); 
                setTimeout(() => {
                    if (faceScanModal) faceScanModal.classList.add('hidden');
                }, 1000);
            };

            FaceScanner.startAdvancedFaceAnalysis(
                video, 
                scanStatusEl, 
                scanDebugEl, 
                referenceDescriptor, 
                onSuccess
            );
        } catch (error) { 
            console.error("Error during face scan process:", error); 
            if (scanStatusEl) scanStatusEl.textContent = `Error: ${error.message}`; 
            stopFaceScan(); 
            setTimeout(() => { 
                if (faceScanModal) faceScanModal.classList.add('hidden'); 
                showCustomAlert("បញ្ហាស្កេនមុខ", `មានបញ្ហា៖\n${error.message}\nសូមប្រាកដថាអ្នកបានអនុញ្ញាតឲ្យប្រើកាមេរ៉ា។`); 
            }, 1500); 
        } 
    }
    function stopFaceScan() { 
        FaceScanner.stopAdvancedFaceAnalysis(); 
        if (video && video.srcObject) { 
            video.srcObject.getTracks().forEach(track => track.stop()); 
            video.srcObject = null; 
        } 
    }
    if (scanFaceBtn) scanFaceBtn.addEventListener('click', startFaceScan);
    if (cancelScanBtn) cancelScanBtn.addEventListener('click', () => { 
        stopFaceScan(); 
        FaceScanner.clearReferenceDescriptor();
        console.log("Reference Descriptor Cleared on Cancel.");
        if (faceScanModal) faceScanModal.classList.add('hidden'); 
    });

    // --- App Navigation & State Logic ---
    function loginUser(userIdToLogin) { const user = allUsersData.find(u => u.id === userIdToLogin); if (!user) { showCustomAlert("Login Error", "មានបញ្ហា Login: រកមិនឃើញទិន្នន័យអ្នកប្រើប្រាស់"); return; } if (rememberMeCheckbox && rememberMeCheckbox.checked) { localStorage.setItem('leaveAppUser', JSON.stringify(user)); } else { localStorage.removeItem('leaveAppUser'); } showLoggedInState(user); }
    function logout() { 
        currentUser = null; 
        FaceScanner.clearReferenceDescriptor(); 
        localStorage.removeItem('leaveAppUser'); 
        if (loginPage) loginPage.classList.remove('hidden'); 
        if (mainAppContainer) mainAppContainer.classList.add('hidden'); 
        if (userPhotoEl) userPhotoEl.src = 'https://placehold.co/100x100/e2e8f0/64748b?text=User'; 
        if (userNameEl) userNameEl.textContent = '...'; 
        if (userIdEl) userIdEl.textContent = '...'; 
        if (userSearchInput) userSearchInput.value = ''; 
        selectedUserId = null; 
        if (scanFaceBtn) scanFaceBtn.disabled = true; 
        
        // Unsubscribe from all listeners
        if (historyUnsubscribe) historyUnsubscribe(); 
        if (outHistoryUnsubscribe) outHistoryUnsubscribe(); 
        if (approverPendingUnsubscribe) approverPendingUnsubscribe();
        if (approverHistoryUnsubscribe) approverHistoryUnsubscribe();
        historyUnsubscribe = null; 
        outHistoryUnsubscribe = null;
        approverPendingUnsubscribe = null;
        approverHistoryUnsubscribe = null;
        
        clearAllPendingTimers();
        signInAnonymously(auth).catch(err => console.error("Error signing in anonymously after logout:", err)); 
    }
    
    function showLoggedInState(user) { 
        // === START: NEW ANNOUNCEMENT LOGIC (MODIFIED to show every time) ===
        // 1. កំណត់ ID សម្រាប់សារនេះ
        const ANNOUNCEMENT_ID = 'announcement_09112025_independence_day';
        // 2. ដាក់សាររបស់អ្នកនៅទីនេះ
        const ANNOUNCEMENT_MESSAGE = "សួស្ដីប្អូបនៗទាំងអស់គ្នា ថ្ងៃទី០៩ វិច្ឆការ ២០២៥ នេះជាថ្ងៃនៃពិធីបុណ្យឯករាជ្យជាតិ ខួបលើកទី ៧២ ដែលខាងសាលាមានការឈប់សម្រាកសិក្សា ដូច្នោះការងារក្នុង DI ប្អូនៗត្រូវវេនធ្វើការពេលយប់ត្រូវប្ដូរវេនមកធ្វើការពេលថ្ងៃ ដោយឡែកពេលយប់ DI ត្រូវបិទ។ សូមអរគុណ!!!";
        
        // បានលុប 'hasRead' check ដើម្បីឱ្យវាបង្ហាញរាល់ពេល
         // (Hide this logic if you want to show it every time)
        if (announcementModal) { 
            console.log(`Showing announcement: ${ANNOUNCEMENT_ID}`);
            if (announcementMessage) announcementMessage.textContent = ANNOUNCEMENT_MESSAGE;
            if (announcementCloseBtn) announcementCloseBtn.dataset.announcementId = ANNOUNCEMENT_ID;
            announcementModal.classList.remove('hidden');
        }
        
        // === END: NEW ANNOUNCEMENT LOGIC ===

        currentUser = user; 
        FaceScanner.clearReferenceDescriptor(); 
        
        // NEW: កំណត់តួនាទី Approver
        isApprover = (user.id === 'D1001'); // ឧទាហរណ៍: បើ ID ស្មើ 'D1001' គឺជា Approver
        if (isApprover && approverSection) {
            approverSection.classList.remove('hidden');
            // NEW: Call setup from Requests module
            const approverListeners = Requests.setupApproverListeners(db, pendingCountEl, approverContainerPending, approverContainerHistory);
            approverPendingUnsubscribe = approverListeners.pending;
            approverHistoryUnsubscribe = approverListeners.history;
        } else if (approverSection) {
            approverSection.classList.add('hidden');
        }
        
        populateAccountPage(user); 
        if (homeUserName) homeUserName.textContent = user.name || '...'; 
        if (loginPage) loginPage.classList.add('hidden'); 
        if (mainAppContainer) mainAppContainer.classList.remove('hidden'); 
        if (criticalErrorDisplay) criticalErrorDisplay.classList.add('hidden'); 
        navigateTo('page-home'); 
        
        // NEW: Call setup from Requests module
        const listeners = Requests.setupHistoryListeners(
            db, 
            user.id, 
            {
                containerLeave: historyContainerLeave, 
                placeholderLeave: historyPlaceholderLeave,
                containerOut: historyContainerOut,
                placeholderOut: historyPlaceholderOut,
                leaveButton: openLeaveRequestBtn,
                outButton: openOutRequestBtn
            },
            {
                show: showPendingAlert,
                hide: hidePendingAlert,
                clear: clearAllPendingTimers,
                setEditing: (val) => { isEditing = val; }
            }
        );
        historyUnsubscribe = listeners.leave;
        outHistoryUnsubscribe = listeners.out;
    }
    
    function populateAccountPage(user) { if (!user) return; if (userPhotoEl && user.photo) { const img = new Image(); img.crossOrigin = "anonymous"; img.src = user.photo; img.onload = () => userPhotoEl.src = img.src; img.onerror = () => userPhotoEl.src = 'https://placehold.co/100x100/e2e8f0/64748b?text=គ្មានរូប'; } else if (userPhotoEl) { userPhotoEl.src = 'https://placehold.co/100x100/e2e8f0/64748b?text=User'; } if (userNameEl) userNameEl.textContent = user.name || 'មិនមាន'; if (userIdEl) userIdEl.textContent = user.id || 'មិនមាន'; if (userGenderEl) userGenderEl.textContent = user.gender || 'មិនមាន'; if (userGroupEl) userGroupEl.textContent = user.group || 'មិនមាន'; if (userDepartmentEl) userDepartmentEl.textContent = user.department || 'មិនមាន'; }
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // === START: MODIFIED navigateTo Function (REMOVED Attendance) ===
    function navigateTo(pageId) { 
        console.log("Navigating to page:", pageId); 
        const isSpecialPage = ['page-request-leave', 'page-request-out', 'page-approver'].includes(pageId);
        
        pages.forEach(page => { 
            const pageEl = document.getElementById(page); 
            if (pageEl) pageEl.classList.add('hidden'); 
        }); 
        
        const targetPage = document.getElementById(pageId); 
        if (targetPage) targetPage.classList.remove('hidden'); 
        
        if (bottomNav) {
            if (isSpecialPage) {
                bottomNav.classList.add('hidden');
            } else {
                bottomNav.classList.remove('hidden');
            }
        }
        
        if (navButtons) { 
            navButtons.forEach(btn => { 
                if (btn.dataset.page === pageId) { 
                    btn.classList.add('text-blue-600'); 
                    btn.classList.remove('text-gray-500'); 
                } else { 
                    btn.classList.add('text-gray-500'); 
                    btn.classList.remove('text-blue-600'); 
                } 
            }); 
        } 
        
        if (mainContent) {
            mainContent.scrollTop = 0; 
        }
        
        // === MODIFIED: Set default state for history tab ===
        if (pageId === 'page-history') {
             // ធានាថា "ច្បាប់ឈប់សម្រាក" តែងតែជា default ពេលបើកទំព័រ
            showHistoryTab('leave');
        }
    }
    // === END: MODIFIED navigateTo Function ===

    if (navButtons) { navButtons.forEach(button => { button.addEventListener('click', () => { const pageToNavigate = button.dataset.page; if (pageToNavigate) navigateTo(pageToNavigate); }); }); }

    // === START: MODIFIED History Page Tabs & Swipe (FIXED BUG) ===
    function showHistoryTab(tabName, fromSwipe = false) { 
        console.log(`Attempting to switch history tab to: ${tabName}`);
        const activeClass = 'active';

        if (tabName === 'leave') {
            // ពិនិត្យមើលថាតើវា active រួចហើយឬនៅ
            if (historyTabLeave.classList.contains(activeClass) && !fromSwipe) {
                console.log("Leave tab is already active.");
                return; // Active រួចហើយ
            }
            
            historyTabLeave.classList.add(activeClass);
            historyTabOut.classList.remove(activeClass);
            
            if (historyContainerLeave) historyContainerLeave.classList.remove('hidden');
            if (historyContainerOut) historyContainerOut.classList.add('hidden');
            
        } else { // 'out'
            // ពិនិត្យមើលថាតើវា active រួចហើយឬនៅ
            if (historyTabOut.classList.contains(activeClass) && !fromSwipe) {
                console.log("Out tab is already active.");
                return; // Active រួចហើយ
            }

            historyTabLeave.classList.remove(activeClass);
            historyTabOut.classList.add(activeClass);

            if (historyContainerLeave) historyContainerLeave.classList.add('hidden');
            if (historyContainerOut) historyContainerOut.classList.remove('hidden');
        }
        if (historyContent) historyContent.scrollTop = 0; 
    }
    // === END: MODIFIED History Page Tabs & Swipe ===
if (historyTabLeave) historyTabLeave.addEventListener('click', () => showHistoryTab('leave'));
    if (historyTabOut) historyTabOut.addEventListener('click', () => showHistoryTab('out'));
    function handleTouchStart(evt) { const firstTouch = evt.touches[0]; touchstartX = firstTouch.clientX; isSwiping = true; }
    function handleTouchMove(evt) { if (!isSwiping) return; const touch = evt.touches[0]; touchendX = touch.clientX; }
    function handleTouchEnd(evt) { if (!isSwiping) return; isSwiping = false; const threshold = 50; const swipedDistance = touchendX - touchstartX; if (Math.abs(swipedDistance) > threshold) { if (swipedDistance < 0) { console.log("Swiped Left"); showHistoryTab('out', true); } else { console.log("Swiped Right"); showHistoryTab('leave', true); } } else { console.log("Swipe distance too short or vertical scroll."); } touchstartX = 0; touchendX = 0; }

    // === START: NEW APPROVER PAGE LOGIC ===
    let currentApproverTab = 'pending';
    function showApproverTab(tabName) {
        if (tabName === currentApproverTab && tabName !== 'pending') return;
        console.log(`Switching approver tab to: ${tabName}`);
        currentApproverTab = tabName;

        const activeClass = 'active';
        const inactiveClass = '';

        if (tabName === 'pending') {
            approverTabPending.classList.add(activeClass);
            approverTabPending.classList.remove(inactiveClass);
            approverTabHistory.classList.remove(activeClass);
            approverTabHistory.classList.add(inactiveClass);
            approverContainerPending.classList.remove('hidden');
            approverContainerHistory.classList.add('hidden');
        } else {
            approverTabPending.classList.remove(activeClass);
            approverTabPending.classList.add(inactiveClass);
            approverTabHistory.classList.add(activeClass);
            approverTabHistory.classList.remove(inactiveClass);
            approverContainerPending.classList.add('hidden');
            approverContainerHistory.classList.remove('hidden');
        }
        
        const approverPage = document.getElementById('page-approver');
        if (approverPage && approverPage.parentElement) {
            approverPage.parentElement.scrollTop = 0; 
        }
    }
    // === END: NEW APPROVER PAGE LOGIC ===


    // --- Leave Request Logic ---
    function updateLeaveDateFields(duration) { 
        const today = Utils.getTodayString(); 
        const todayFormatted = Utils.getTodayString('dd/mm/yyyy'); 
        if (!leaveSingleDateContainer || !leaveDateRangeContainer || !leaveSingleDateInput || !leaveStartDateInput || !leaveEndDateInput) { console.error("Date input elements not found for Leave form."); return; } 
        if (!duration) { 
            leaveSingleDateContainer.classList.add('hidden'); 
            leaveDateRangeContainer.classList.add('hidden'); 
            return; 
        } 
        if (singleDayLeaveDurations.includes(duration)) { 
            leaveSingleDateContainer.classList.remove('hidden'); 
            leaveDateRangeContainer.classList.add('hidden'); 
            leaveSingleDateInput.value = todayFormatted; 
        } else { 
            leaveSingleDateContainer.classList.add('hidden'); 
            leaveDateRangeContainer.classList.remove('hidden'); 
            leaveStartDateInput.value = today; 
            const days = durationToDaysMap[duration] ?? 1; 
            const endDateValue = Utils.addDays(today, days); 
            leaveEndDateInput.value = endDateValue; 
            leaveEndDateInput.min = today; 
        } 
    }

    // === START: NEW Validation Functions (With "ទៅ" check) ===
    function validateLeaveForm() {
        const isDurationValid = !!selectedLeaveDuration;
        const currentReason = selectedLeaveReason || ''; // យក Reason បច្ចុប្បន្ន
        
        let isReasonValid = true;
        let reasonErrorMessage = ""; // សារ Error

        // 1. ពិនិត្យមើលថា "មូលហេតុ" មិនទទេ
        if (!currentReason || currentReason.trim() === '') {
            isReasonValid = false;
            reasonErrorMessage = ""; // មិនបាច់បង្ហាញ Error បើគ្រាន់តែទទេ (ប៊ូតុងនឹងមិនបង្ហាញ)
        } 
        // 2. (NEW) ពិនិត្យមើលពាក្យ "ទៅ"
        else if (currentReason.includes("ទៅ")) {
            isReasonValid = false;
            reasonErrorMessage = 'សូមលោកអ្នកពិនិត្យមើល "មូលហេតុ"ឡើងវិញ!!!';
        }

        // បង្ហាញ ឬ លាក់ សារ Error សម្រាប់ "មូលហេតុ"
        if (!isReasonValid && reasonErrorMessage) {
            // បង្ហាញ Error
            if (leaveRequestErrorEl) {
                leaveRequestErrorEl.textContent = reasonErrorMessage;
                leaveRequestErrorEl.classList.remove('hidden');
            }
        } else {
            // លាក់ Error (ប្រសិនបើវា Valid ឬ គ្រាន់តែទទេ)
            if (leaveRequestErrorEl) {
                leaveRequestErrorEl.classList.add('hidden');
            }
        }

        // បង្ហាញ/លាក់ប៊ូតុង (ត្រូវតែ Valid ទាំងពីរ)
        animateSubmitButton(submitLeaveRequestBtn, isDurationValid && isReasonValid);
    }

    function validateOutForm() {
        const isDurationValid = !!selectedOutDuration;
        const isReasonValid = selectedOutReason && selectedOutReason.trim() !== '';
        
        animateSubmitButton(submitOutRequestBtn, isDurationValid && isReasonValid);
    }
    // === END: NEW Validation Functions ===

    // === START: REFACTORED Form Openers ===
    function openLeaveForm() {
        if (!currentUser) return showCustomAlert("Error", "សូម Login ជាមុនសិន។"); 
    
        // Populate user info in form
        document.getElementById('request-leave-user-photo').src = currentUser.photo || 'https://placehold.co/60x60/e2e8f0/64748b?text=User';
        document.getElementById('request-leave-user-name').textContent = currentUser.name;
        document.getElementById('request-leave-user-id').textContent = currentUser.id;
        document.getElementById('request-leave-user-department').textContent = currentUser.department || 'មិនមាន';
        
        // Reset form
        if (leaveDurationSearchInput) leaveDurationSearchInput.value = ''; 
        if (leaveReasonSearchInput) leaveReasonSearchInput.value = ''; 
        selectedLeaveDuration = null; 
        selectedLeaveReason = null; 
        if (leaveSingleDateContainer) leaveSingleDateContainer.classList.add('hidden'); 
        if (leaveDateRangeContainer) leaveDateRangeContainer.classList.add('hidden'); 
        if (leaveRequestErrorEl) leaveRequestErrorEl.classList.add('hidden'); 
        if (leaveRequestLoadingEl) leaveRequestLoadingEl.classList.add('hidden'); 
        
        if (submitLeaveRequestBtn) {
             submitLeaveRequestBtn.disabled = false; 
             animateSubmitButton(submitLeaveRequestBtn, false); // លាក់ប៊ូតុងពេលបើកទំព័រ
        }

        navigateTo('page-request-leave');
    }

    function openOutForm() {
        if (!currentUser) return showCustomAlert("Error", "សូម Login ជាមុនសិន។"); 
    
        document.getElementById('request-out-user-photo').src = currentUser.photo || 'https://placehold.co/60x60/e2e8f0/64748b?text=User';
        document.getElementById('request-out-user-name').textContent = currentUser.name;
        document.getElementById('request-out-user-id').textContent = currentUser.id;
        
        // FIX (ប្រើ ID ត្រឹមត្រូវពី HTML)
        document.getElementById('request-leave-user-department').textContent = currentUser.department || 'មិនមាន';
        
        if (outDurationSearchInput) outDurationSearchInput.value = ''; 
        if (outReasonSearchInput) outReasonSearchInput.value = ''; 
        if (outDateInput) outDateInput.value = Utils.getTodayString('dd/mm/yyyy'); 
        selectedOutDuration = null; 
        selectedOutReason = null; 
        if (outRequestErrorEl) outRequestErrorEl.classList.add('hidden'); 
        if (outRequestLoadingEl) outRequestLoadingEl.classList.add('hidden'); 
        
        if (submitOutRequestBtn) {
            submitOutRequestBtn.disabled = false; 
            animateSubmitButton(submitOutRequestBtn, false); // លាក់ប៊ូតុងពេលបើកទំព័រ
        }
        
        navigateTo('page-request-out');
    }
    // === END: REFACTORED Form Openers ===
    
    // --- Request Form Event Listeners (Calling Requests.js) ---
    if (openLeaveRequestBtn) openLeaveRequestBtn.addEventListener('click', () => { 
        showAgreementModal('leave'); // គ្រាន់តែហៅ Modal
    });
    
    if (cancelLeaveRequestBtn) cancelLeaveRequestBtn.addEventListener('click', () => navigateTo('page-home'));
    
    if (submitLeaveRequestBtn) submitLeaveRequestBtn.addEventListener('click', () => {
        selectedLeaveDuration = leaveDurations.includes(leaveDurationSearchInput.value) ? leaveDurationSearchInput.value : null; 
        selectedLeaveReason = leaveReasonSearchInput.value;

        // === START: NEW VALIDATION RULE (Safety Net) ===
        if (selectedLeaveReason && selectedLeaveReason.includes("ទៅ")) {
            if (leaveRequestErrorEl) {
                leaveRequestErrorEl.textContent = 'សូមលោកអ្នកពិនិត្យមើល "មូលហេតុ"ឡើងវិញ!!!';
                leaveRequestErrorEl.classList.remove('hidden');
            }
            return; // បញ្ឈប់ការ Submit
        }
        // === END: NEW VALIDATION RULE ===

        Requests.submitLeaveRequest(
            db, 
            auth, 
            currentUser, 
            { duration: selectedLeaveDuration, reason: selectedLeaveReason },
            { singleDate: leaveSingleDateInput.value, startDate: leaveStartDateInput.value, endDate: leaveEndDateInput.value },
            { errorEl: leaveRequestErrorEl, loadingEl: leaveRequestLoadingEl, submitBtn: submitLeaveRequestBtn },
            { singleDayDurations: singleDayLeaveDurations, navigateTo: navigateTo, showCustomAlert: showCustomAlert }
        );
    });

    if (openOutRequestBtn) openOutRequestBtn.addEventListener('click', () => { 
        showAgreementModal('out'); // គ្រាន់តែហៅ Modal
    });
    
    if (cancelOutRequestBtn) cancelOutRequestBtn.addEventListener('click', () => navigateTo('page-home'));
    
    if (submitOutRequestBtn) submitOutRequestBtn.addEventListener('click', () => {
        selectedOutDuration = outDurations.includes(outDurationSearchInput.value) ? outDurationSearchInput.value : null; 
        selectedOutReason = outReasonSearchInput.value;
        Requests.submitOutRequest(
            db,
            auth,
            currentUser,
            { duration: selectedOutDuration, reason: selectedOutReason },
            { date: outDateInput.value },
            { errorEl: outRequestErrorEl, loadingEl: outRequestLoadingEl, submitBtn: submitOutRequestBtn },
            { navigateTo: navigateTo, showCustomAlert: showCustomAlert }
        );
    });


    // --- Custom Alert Modal Logic ---
    function showCustomAlert(title, message, type = 'warning') { if (!customAlertModal) return; if (customAlertTitle) customAlertTitle.textContent = title; if (customAlertMessage) customAlertMessage.textContent = message; if (type === 'success') { if (customAlertIconSuccess) customAlertIconSuccess.classList.remove('hidden'); if (customAlertIconWarning) customAlertIconWarning.classList.add('hidden'); } else { if (customAlertIconSuccess) customAlertIconSuccess.classList.add('hidden'); if (customAlertIconWarning) customAlertIconWarning.classList.remove('hidden'); } customAlertModal.classList.remove('hidden'); }
    function hideCustomAlert() { if (customAlertModal) customAlertModal.classList.add('hidden'); }

    // === START: NEW AGREEMENT MODAL LOGIC ===
    const agreementMessages = {
        leave: {
            title: "សុំច្បាប់ឈប់សម្រាក",
            message: "ការស្នើសុំច្បាប់ឈប់សម្រាកគឺអាចធ្វើបានពីចម្ងាយ (ឌីជីថលពេញលេញ) និងអនុញ្ញាតសម្រាប់តែនិស្សិតហាត់ការធ្វើការក្នុងអគារ DI តែប៉ុណ្ណោះ។"
        },
        out: {
            title: "សុំច្បាប់ចេញក្រៅ",
            // យើងប្រើ .innerHTML សម្រាប់อันนี้ ដូច្នេះយើងអាចប្រើ <ul>
            message: `ការស្នើសុំច្បាប់ចេញក្រៅតម្រូវឱ្យអ្នកមកបង្ហាញខ្លួន និងសុំការអនុញ្ញាតដោយផ្ទាល់នៅអគារ B ជាមុនសិន ទើបសំណើររបស់អ្នកត្រូវបានត្រួតពិនិត្យ និងអនុម័ត។
<br><br>បើពុំដូច្នោះទេ សំណើររបស់អ្នកនឹងត្រូវបានបដិសេធដោយស្វ័យប្រវត្តិ ឬត្រូវបានលុបចោល។
<br><br><hr class="my-2">
<b class="font-semibold text-gray-700">អ្នកដែលមានសិទ្ធិអនុញ្ញាត៖</b>
<ul class="list-disc list-inside mt-1 pl-2 text-sm">
    <li>លោកគ្រូ ពៅ ដារ៉ូ</li>
    <li>លោកគ្រូ ខេង ភក្ដី</li>
    <li>ក្រុមការងារពិសេស (ជំនួយការ)</li>
</ul>
<br><b class="font-semibold text-gray-700 mt-2 block">បញ្ជាក់៖</b> សម្រាប់ច្បាប់ចេញក្រៅគឺអនុញ្ញាតសម្រាប់និស្សិតទូទៅ។`
        }
    };

    function showAgreementModal(type) {
        if (!agreementModal || !agreementMessages[type]) return;

        const content = agreementMessages[type];

        if (agreementTitle) agreementTitle.textContent = content.title;
        
        // ប្រើ .innerHTML សម្រាប់ 'out' (ព្រោះមាន HTML) និង .textContent សម្រាប់ 'leave'
        if (type === 'out') {
             if (agreementMessage) agreementMessage.innerHTML = content.message;
        } else {
             if (agreementMessage) agreementMessage.textContent = content.message;
        }

        if (agreementCheckbox) agreementCheckbox.checked = false;
        if (agreementAgreeBtn) {
            agreementAgreeBtn.disabled = true;
            agreementAgreeBtn.dataset.type = type; // រក្សាទុក Type
        }
        
        agreementModal.classList.remove('hidden');
    }
    // === END: NEW AGREEMENT MODAL LOGIC ===

    // === START: NEW Animation Function ===
    /**
     * បង្ហាញ ឬ លាក់ប៊ូតុង Submit ជាមួយ Animation
     * @param {HTMLElement} buttonEl - ប៊ូតុងដែលត្រូវបង្ហាញ/លាក់
     * @param {boolean} show - True (បង្ហាញ), False (លាក់)
     */
    function animateSubmitButton(buttonEl, show) {
        if (!buttonEl) return;

        if (show) {
            // បើប៊ូតុងកំពុងបង្ហាញស្រាប់ មិនបាច់ធ្វើអ្វីទេ
            if (!buttonEl.classList.contains('hidden')) return; 

            buttonEl.classList.remove('hidden');
            // ប្រើ setTimeout តូចមួយ (10ms) ដើម្បីឱ្យ Browser ចាប់ផ្តើម Animation
            setTimeout(() => {
                buttonEl.classList.remove('opacity-0', 'translate-y-2');
            }, 10);
        } else {
            // បើប៊ូតុងកំពុងលាក់ស្រាប់ មិនបាច់ធ្វើអ្វីទេ
            if (buttonEl.classList.contains('hidden')) return;

            buttonEl.classList.add('opacity-0', 'translate-y-2');
            // លាក់ប៊ូតុង បន្ទាប់ពី Animation ចប់ (300ms)
            setTimeout(() => {
                buttonEl.classList.add('hidden');
            }, 300); // ត្រូវតែដូចគ្នានឹង 'duration-300' ក្នុង HTML
        }
    }
    // === END: NEW Animation Function ===

    // === START: MODIFICATION (Pending Alert Logic Updated) ===
    function showPendingAlert(message) {
        if (!pendingStatusAlert || !pendingStatusMessage) return;
        if (toastDisplayTimer) clearTimeout(toastDisplayTimer);
        pendingStatusMessage.textContent = message;
        pendingStatusAlert.classList.remove('hidden');
        
        toastDisplayTimer = setTimeout(() => {
            hidePendingAlert();
        }, 5000); 
    }
    function hidePendingAlert() {
        if (toastDisplayTimer) clearTimeout(toastDisplayTimer);
        toastDisplayTimer = null;
        if (pendingStatusAlert) pendingStatusAlert.classList.add('hidden');
    }
    function clearAllPendingTimers() {
        if (pendingAlertTimer20s) clearTimeout(pendingAlertTimer20s);
        if (pendingAlertTimer50s) clearTimeout(pendingAlertTimer50s);
        if (pendingAlertTimer120s) clearTimeout(pendingAlertTimer120s);
        pendingAlertTimer20s = null;
        pendingAlertTimer50s = null;
        pendingAlertTimer120s = null;
        hidePendingAlert(); 
    }
    // === END: MODIFICATION ===

    // === START: Edit/Delete/Return/Invoice Modal Logic (Refactored) ===
    
    // Edit
    function openEditModal(requestId, type) {
        isEditing = true;
        clearAllPendingTimers();
        Requests.openEditModal(
            db, 
            requestId, 
            type,
            { 
                modal: editModal, 
                title: editModalTitle, 
                reqId: editRequestId, 
                durationSearch: editDurationSearchInput,
                reasonSearch: editReasonSearchInput,
                singleDateContainer: editSingleDateContainer,
                dateRangeContainer: editDateRangeContainer,
                leaveDateSingle: editLeaveDateSingle,
                leaveDateStart: editLeaveDateStart,
                leaveDateEnd: editLeaveDateEnd,
                errorEl: editErrorEl,
                loadingEl: editLoadingEl
            },
            {
                leaveDurations, outDurations, leaveDurationItems, outDurationItems, 
                leaveReasons, outReasons, leaveReasonItems, outReasonItems,
                singleDayLeaveDurations, durationToDaysMap
            },
            setupSearchableDropdown // Pass the setup function
        );
    }
    
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', async () => { 
        await Requests.cancelEdit(db, editRequestId.value, editModalTitle.textContent);
        if (editModal) editModal.classList.add('hidden'); 
        isEditing = false; 
    });

    if (submitEditBtn) submitEditBtn.addEventListener('click', async () => {
        const type = (editModalTitle.textContent.includes("ឈប់")) ? 'leave' : 'out';
        const newDuration = (type === 'leave' ? leaveDurations : outDurations).includes(editDurationSearchInput.value) ? editDurationSearchInput.value : null;
        const newReason = editReasonSearchInput.value; 

        await Requests.submitEdit(
            db,
            editRequestId.value,
            type,
            { duration: newDuration, reason: newReason },
            { 
                singleDate: editLeaveDateSingle.value, 
                startDate: editLeaveDateStart.value, 
                endDate: editLeaveDateEnd.value 
            },
            { 
                errorEl: editErrorEl, 
                loadingEl: editLoadingEl, 
                modal: editModal 
            },
            { 
                singleDayLeaveDurations: singleDayLeaveDurations, 
                showCustomAlert: showCustomAlert 
            }
        );
        isEditing = false; 
    });

    // Delete
    function openDeleteModal(requestId, type) { 
        if (deleteRequestId) deleteRequestId.value = requestId; 
        if (deleteCollectionType) deleteCollectionType.value = type; 
        if (deleteModal) deleteModal.classList.remove('hidden'); 
    }
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => { 
        if (deleteModal) deleteModal.classList.add('hidden'); 
    });
    if (deleteConfirmBtn) deleteConfirmBtn.addEventListener('click', () => {
        Requests.deleteRequest(
            db,
            deleteRequestId.value,
            deleteCollectionType.value,
            { modal: deleteModal, confirmBtn: deleteConfirmBtn },
            showCustomAlert
        );
    });

    // Return
    function stopReturnScan(clearId = true) { 
        FaceScanner.stopAdvancedFaceAnalysis(); 
        if (returnVideo && returnVideo.srcObject) { 
            returnVideo.srcObject.getTracks().forEach(track => track.stop()); 
            returnVideo.srcObject = null; 
        } 
        if (clearId) Requests.setCurrentReturnRequestId(null); 
    }

    async function startReturnConfirmation(requestId) { 
        console.log("startReturnConfirmation called for:", requestId); 
        if (!currentUser || !currentUser.photo) { 
            showCustomAlert("Error", "មិនអាចទាញយករូបថតយោងរបស់អ្នកបានទេ។"); 
            return; 
        } 
        Requests.setCurrentReturnRequestId(requestId); 
        if (returnScanModal) returnScanModal.classList.remove('hidden'); 
        if (returnScanStatusEl) returnScanStatusEl.textContent = 'កំពុងព្យាយាមបើកកាមេរ៉ា...'; 
        if (returnScanDebugEl) returnScanDebugEl.textContent = ''; 
        
        try { 
            if (returnScanStatusEl) returnScanStatusEl.textContent = 'កំពុងវិភាគរូបថតយោង...'; 
            const referenceDescriptor = await FaceScanner.getReferenceDescriptor(currentUser.photo); 
            if (returnScanStatusEl) returnScanStatusEl.textContent = 'កំពុងស្នើសុំបើកកាមេរ៉ា...'; 
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} }); 

            if (returnVideo) returnVideo.srcObject = stream; 
            if (returnScanStatusEl) returnScanStatusEl.textContent = 'សូមដាក់មុខរបស់អ្នកឲ្យចំកាមេរ៉ា'; 

            FaceScanner.stopAdvancedFaceAnalysis(); 

            const onSuccess = () => {
                console.log("Return Scan Success!");
                handleReturnFaceScanSuccess(); 
            };

            FaceScanner.startAdvancedFaceAnalysis(
                returnVideo, 
                returnScanStatusEl, 
                returnScanDebugEl, 
                referenceDescriptor, 
                onSuccess
            );
        } catch (error) { 
            console.error("Error during return scan process:", error); 
            if (returnScanStatusEl) returnScanStatusEl.textContent = `Error: ${error.message}`; 
            stopReturnScan(true); 
            setTimeout(() => { 
                if (returnScanModal) returnScanModal.classList.add('hidden'); 
                showCustomAlert("បញ្ហាស្កេនមុខ", `មានបញ្ហា៖\n${error.message}\nសូមប្រាកដថាអ្នកបានអនុញ្ញាតឲ្យប្រើកាមេរ៉ា។`); 
            }, 1500); 
        } 
    }

    if (cancelReturnScanBtn) cancelReturnScanBtn.addEventListener('click', () => { 
        stopReturnScan(true); 
        if (returnScanModal) returnScanModal.classList.add('hidden'); 
    });
    
    function handleReturnFaceScanSuccess() { 
        if (returnScanStatusEl) returnScanStatusEl.textContent = 'ស្កេនមុខជោគជ័យ!\nកំពុងស្នើសុំទីតាំង...'; 
        if (returnScanDebugEl) returnScanDebugEl.textContent = 'សូមអនុញ្ញាតឲ្យប្រើ Location'; 
        if (navigator.geolocation) { 
            navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); 
        } else { 
            console.error("Geolocation is not supported."); 
            showCustomAlert("បញ្ហាទីតាំង", Requests.LOCATION_FAILURE_MESSAGE); 
            if (returnScanModal) returnScanModal.classList.add('hidden'); 
            Requests.setCurrentReturnRequestId(null); 
        } 
    }
    
    async function onLocationSuccess(position) { 
        const userLat = position.coords.latitude; 
        const userLng = position.coords.longitude; 
        console.log(`Location found: ${userLat}, ${userLng}`); 
        if (returnScanStatusEl) returnScanStatusEl.textContent = 'បានទីតាំង! កំពុងពិនិត្យ...'; 
        if (returnScanDebugEl) returnScanDebugEl.textContent = `Lat: ${userLat.toFixed(6)}, Lng: ${userLng.toFixed(6)}`; 
        
        const isInside = Utils.isPointInPolygon([userLat, userLng], Requests.allowedAreaCoords); 
        
        if (isInside) { 
            console.log("User is INSIDE."); 
            if (returnScanStatusEl) returnScanStatusEl.textContent = 'ទីតាំងត្រឹមត្រូវ! កំពុងរក្សាទុក...'; 
            await Requests.updateReturnStatusInFirestore(
                db, 
                { modal: returnScanModal, showCustomAlert: showCustomAlert }
            ); 
        } else { 
            console.log("User is OUTSIDE."); 
            if (returnScanStatusEl) returnScanStatusEl.textContent = 'ទីតាំងមិនត្រឹមត្រូវ។'; 
            showCustomAlert("បញ្ហាទីតាំង", Requests.LOCATION_FAILURE_MESSAGE); 
            if (returnScanModal) returnScanModal.classList.add('hidden'); 
            Requests.setCurrentReturnRequestId(null); 
        } 
    }
    
    function onLocationError(error) { 
        console.error(`Geolocation Error (${error.code}): ${error.message}`); 
        if (returnScanStatusEl) returnScanStatusEl.textContent = 'មិនអាចទាញយកទីតាំងបានទេ។'; 
        showCustomAlert("បញ្ហាទីតាំង", Requests.LOCATION_FAILURE_MESSAGE); 
        if (returnScanModal) returnScanModal.classList.add('hidden'); 
        Requests.setCurrentReturnRequestId(null); 
    }

    // Invoice
    function openInvoiceModal(requestId, type) {
        Requests.openInvoiceModal(
            db,
            requestId,
            type,
            {
                modal: invoiceModal,
                title: invoiceModalTitle,
                userName: invoiceUserName,
                userId: invoiceUserId,
                userDept: invoiceUserDept,
                requestType: invoiceRequestType,
                duration: invoiceDuration,
                dates: invoiceDates,
                reason: invoiceReason,
                approver: invoiceApprover,
                decisionTime: invoiceDecisionTime,
                reqId: invoiceRequestId,
                returnInfo: invoiceReturnInfo,
                returnStatus: invoiceReturnStatus,
                returnTime: invoiceReturnTime,
                shareBtn: shareInvoiceBtn
            },
            showCustomAlert
        );
    }
    // === END: Edit/Delete/Return/Invoice Modal Logic ===
    
    // === NEW APPROVER PAGE EVENT LISTENERS ===
    if (openApproverDashboardBtn) {
        openApproverDashboardBtn.addEventListener('click', () => {
            console.log("Opening Approver Dashboard...");
            navigateTo('page-approver');
            showApproverTab('pending'); // បើក Tab Pending ដំបូង
        });
    }

    if (closeApproverDashboardBtn) {
        closeApproverDashboardBtn.addEventListener('click', () => {
            console.log("Closing Approver Dashboard...");
            navigateTo('page-home');
        });
    }

    // Approver Tabs
    if (approverTabPending) approverTabPending.addEventListener('click', () => showApproverTab('pending'));
    if (approverTabHistory) approverTabHistory.addEventListener('click', () => showApproverTab('history'));

    // Approver History Tap Handler (សម្រាប់ Approve/Reject)
    const approverActionHandler = (event) => Requests.handleApproverAction(
        event, 
        db, 
        currentUser, 
        isApprover, 
        showCustomAlert,
        (msg) => Requests.sendTelegramNotification(msg) // Pass the notification function
    );
    if (approverContainerPending) {
        approverContainerPending.addEventListener('click', approverActionHandler, { passive: false });
    }
    if (approverContainerHistory) {
        approverContainerHistory.addEventListener('click', approverActionHandler, { passive: false });
    }
    // === END APPROVER EVENT LISTENERS ===

}); // End of DOMContentLoaded
