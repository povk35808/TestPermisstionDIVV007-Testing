// --- File: utils.js ---
// នេះគឺជា Module ថ្មី សម្រាប់ផ្ទុកនូវរាល់អនុគមន៍ជំនួយ (Helpers)

/**
 * យកកាលបរិច្ឆេទថ្ងៃនេះ ជា string
 * @param {string} format - 'yyyy-mm-dd' (default) or 'dd/mm/yyyy'
 * @returns {string}
 */
export function getTodayString(format = 'yyyy-mm-dd') { 
    const today = new Date(); 
    const yyyy = today.getFullYear(); 
    const mm = String(today.getMonth() + 1).padStart(2, '0'); 
    const dd = String(today.getDate()).padStart(2, '0'); 
    if (format === 'dd/mm/yyyy') return `${dd}/${mm}/${yyyy}`; 
    return `${yyyy}-${mm}-${dd}`; 
}

/**
 * ប្តូរ Format ពី dd/mm/yyyy (Firestore) ទៅ yyyy-mm-dd (HTML Input)
 * @param {string} dbDate - e.g., "07/11/2025"
 * @returns {string} - e.g., "2025-11-07"
 */
export function formatDbDateToInput(dbDate) { 
    if (!dbDate || dbDate.split('/').length !== 3) return getTodayString(); 
    const parts = dbDate.split('/'); 
    return `${parts[2]}-${parts[1]}-${parts[0]}`; 
}

/**
 * ប្តូរ Format ពី yyyy-mm-dd (HTML Input) ទៅ dd/mm/yyyy
 * @param {string} inputDate - e.g., "2025-11-07"
 * @returns {string} - e.g., "07/11/2025"
 */
export function formatInputDateToDb(inputDate) { 
    if (!inputDate || inputDate.split('-').length !== 3) return getTodayString('dd/mm/yyyy'); 
    const parts = inputDate.split('-'); 
    return `${parts[2]}/${parts[1]}/${parts[0]}`; 
}

/**
 * បូកថ្ងៃទៅកាលបរិច្ឆេទចាប់ផ្តើម
 * @param {string} startDateStr - e.g., "2025-11-07"
 * @param {number} days - e.g., 3
 * @returns {string} - e.g., "2025-11-09"
 */
export function addDays(startDateStr, days) { 
    try { 
        const date = new Date(startDateStr); 
        if (isNaN(date.getTime())) return getTodayString(); 
        date.setDate(date.getDate() + Math.ceil(days) - 1); 
        const yyyy = date.getFullYear(); 
        const mm = String(date.getMonth() + 1).padStart(2, '0'); 
        const dd = String(date.getDate()).padStart(2, '0'); 
        return `${yyyy}-${mm}-${dd}`; 
    } catch (e) { 
        console.error("Error in addDays:", e); 
        return getTodayString(); 
    } 
}

/**
 * ប្តូរ Timestamp របស់ Firestore ទៅជា String ដែលអាចអានបាន
 * @param {object|Date|string} timestamp - Object ពី Firestore
 * @param {string} format - 'HH:mm dd/MM/yyyy' (default), 'time', 'date'
 * @returns {string}
 */
export function formatFirestoreTimestamp(timestamp, format = 'HH:mm dd/MM/yyyy') { 
    let date; 
    if (!timestamp) return ""; 
    if (timestamp instanceof Date) date = timestamp; 
    else if (timestamp.toDate) date = timestamp.toDate(); 
    else if (typeof timestamp === 'string') { 
        date = new Date(timestamp); 
        if (isNaN(date.getTime())) return ""; 
    } else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000); 
    else return ""; 
    
    const hours = String(date.getHours()).padStart(2, '0'); 
    const minutes = String(date.getMinutes()).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0'); 
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = date.getFullYear(); 
    
    if (format === 'HH:mm' || format === 'time') return `${hours}:${minutes}`; 
    if (format === 'dd/MM/yyyy' || format === 'date') return `${day}/${month}/${year}`; 
    return `${hours}:${minutes} ${day}/${month}/${year}`; 
}

/**
 * គ្រាន់តែជា Helper តូចមួយ (មិនទាន់បានប្រើ)
 */
export function parseReturnedAt_(returnedAtString) { 
    if (!returnedAtString || typeof returnedAtString !== 'string') return { date: "", time: "" }; 
    const parts = returnedAtString.split(' '); 
    if (parts.length === 2) return { time: parts[0], date: parts[1] }; 
    return { date: returnedAtString, time: "" }; 
}

/**
 * ប្តូរ Format ពី (yyyy-mm-dd ឬ dd/mm/yyyy) ទៅជា dd-Mmm-yyyy
 * @param {string} dateString - e.g., "2025-11-07" or "07/11/2025"
 * @returns {string} - e.g., "07-Nov-2025"
 */
export function formatDateToDdMmmYyyy(dateString) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let date;
    if (dateString.includes('-') && dateString.split('-').length === 3) { // yyyy-mm-dd
        const parts = dateString.split('-');
        date = new Date(parts[0], parts[1] - 1, parts[2]); // year, month (0-indexed), day
    } else if (dateString.includes('/') && dateString.split('/').length === 3) { // dd/mm/yyyy
        const parts = dateString.split('/');
        date = new Date(parts[2], parts[1] - 1, parts[0]); // year, month (0-indexed), day
    } else {
        date = new Date(); // Fallback
    }
    if (isNaN(date.getTime())) date = new Date(); // Error handling
    const day = String(date.getDate()).padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`; // ត្រឡប់ជា '07-Nov-2025'
}

/**
 * ប្តូរ Format ពី dd-Mmm-yyyy (Firestore) ទៅជា yyyy-mm-dd (HTML Input)
 * @param {string} ddMmmYyyy - e.g., "07-Nov-2025"
 * @returns {string} - e.g., "2025-11-07"
 */
export function parseDdMmmYyyyToInputFormat(ddMmmYyyy) {
    if (!ddMmmYyyy || ddMmmYyyy.split('-').length !== 3) return getTodayString(); // fallback
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = ddMmmYyyy.split('-'); // [ '07', 'Nov', '2025' ]
    if(parts.length !== 3) return getTodayString();
    const day = parts[0];
    const monthIndex = monthNames.indexOf(parts[1]);
    const year = parts[2];
    if (monthIndex === -1) return getTodayString(); // fallback
    const mm = String(monthIndex + 1).padStart(2, '0');
    return `${year}-${mm}-${day}`; // ត្រឡប់ជា 'yyyy-mm-dd'
}

/**
 * ពិនិត្យមើលថាតើ ចំណុច GPS (lat, lng) ស្ថិតនៅក្នុងតំបន់ដែលបានកំណត់ (Polygon) ឬអត់
 * @param {Array<number>} point - [lat, lng]
 * @param {Array<Array<number>>} polygon - [[lat1, lng1], [lat2, lng2], ...]
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) { 
    const [lat, lng] = point; 
    let isInside = false; 
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { 
        const [lat_i, lng_i] = polygon[i]; 
        const [lat_j, lng_j] = polygon[j]; 
        const intersect = ((lng_i > lng) !== (lng_j > lng)) && (lat < (lat_j - lat_i) * (lng - lng_i) / (lng_j - lng_i) + lat_i); 
        if (intersect) isInside = !isInside; 
    } 
    return isInside; 
}
