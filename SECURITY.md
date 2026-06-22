# Security & Privacy / אבטחה ופרטיות

> בעברית תחילה, ואחריו באנגלית. / Hebrew first, English below.

---

## עברית

### סקירת אבטחה ופרטיות

Voice Reader היא תוסף Chrome (Manifest V3) שמקריא בקול טקסט שאתם מסמנים בדפדפן.
התוסף פועל **באופן מקומי לחלוטין** בתוך הדפדפן:

- **אין שרת ענן, אין API, אין חשבון משתמש, אין הרשמה.**
- **אין טלמטריה, אין אנליטיקס, אין מעקב.** לא נמצאה בקוד שום קריאה ל-Google Analytics, sendBeacon, או כל שירות מעקב.
- **אין קוד מרוחק.** כל ה-WASM (מנוע ONNX Runtime ו-Piper phonemize) ארוז בתוך התוסף עצמו תחת `vendor/` ונטען מ-`chrome-extension://` בלבד. אין `eval`, אין `new Function`, אין טעינת סקריפט מרשת.
- **אין קריאה לעוגיות, סיסמאות, או שדות טופס.** התוסף קורא רק את **הטקסט המסומן** (`window.getSelection()`) לצורך ההקראה.

#### הקריאה היחידה לרשת

הקריאה החיצונית **היחידה** היא הורדה חד-פעמית של מודל הקול הנוירוני (Piper) משרת **HuggingFace**:

- כתובת: `https://huggingface.co/diffusionstudio/piper-voices/...`
- מה יורד: קובץ מודל הקול (`.onnx` + `.json`), בגודל ~63–75MB, פעם אחת לכל קול.
- המודל נשמר מקומית ב-OPFS (Origin Private File System) של הדפדפן; לאחר ההורדה הראשונה התוסף עובד **לחלוטין במצב לא-מקוון**.
- ההורדה היא **קריאת נתונים בלבד** (GET של קובץ). **שום טקסט שלכם, שום מידע אישי, ושום נתוני שימוש אינם נשלחים** ל-HuggingFace או לכל יעד אחר.

מדיניות ה-CSP (`content_security_policy`) במניפסט אוכפת זאת ברמת הדפדפן — `connect-src` מתיר רק את `'self'` ואת דומייני HuggingFace. כל ניסיון תקשורת ליעד אחר ייחסם על ידי הדפדפן.

> הערה טכנית: בספרייה הארוזה (`vendor/piper/piper-tts-web.js`) קיימות כברירת-מחדל לא-פעילה קבועות שמצביעות ל-cdnjs/jsdelivr עבור קבצי WASM. הקוד שלנו (`src/offscreen/offscreen.js`) **דורס** ערכי ברירת-מחדל אלה ומפנה את כל קבצי ה-WASM לחבילה המקומית. בנוסף, ה-CSP חוסם דומיינים אלה ממילא.

### טבלת הרשאות — מדוע כל הרשאה נחוצה

| הרשאה | למה היא נחוצה |
|--------|----------------|
| `contextMenus` | להוסיף את פריט התפריט "Voice Read" בלחיצה ימנית על טקסט מסומן (Explanatory / Storytelling). |
| `storage` | לשמור את העדפות המשתמש בלבד — מנוע נבחר, קול, מהירות, גובה צליל, ומצב הכתוביות. אין שמירת תוכן שנקרא. |
| `activeTab` | לפעול על הלשונית הפעילה כשהמשתמש מפעיל את ההקראה. |
| `scripting` | להזריק את סקריפט התוכן ללשוניות שכבר היו פתוחות לפני התקנת/רענון התוסף, כדי שההקראה תעבוד מיד. |
| `offscreen` | ליצור מסמך offscreen להשמעת אודיו ולהרצת מנוע Piper הנוירוני (MV3 אינו מאפשר השמעת אודיו ב-service worker). |

> אין `host_permissions` נפרדות. ה-`content_scripts` תואמים `<all_urls>` כדי שתוכלו להקריא טקסט בכל אתר — אך הסקריפט קורא רק את הטקסט שאתם מסמנים, ולא נוגע בעוגיות, סיסמאות או טפסים.

### איסוף מידע / Data handling

**לא נאסף ולא משודר שום מידע אישי.**

- אין שליחת תוכן הדף או הטקסט המסומן לשום שרת חיצוני.
- אין מזהים ייחודיים, אין מעקב משתמשים, אין פרופילים.
- הנתון היחיד הנשמר הוא **הגדרות התוסף** (`vr_settings` ב-`chrome.storage.sync`, ומצב כתוביות ב-`chrome.storage.local`). נתון זה נשמר בדפדפן/חשבון Google שלכם בלבד ומשמש את התוסף בלבד.
- הטקסט המסומן נשלח אך ורק למסמך ה-offscreen המקומי לצורך סינתזת הקול, ולעולם לא לרשת.

### דיווח על פגיעות אבטחה

מצאתם בעיית אבטחה? אנא פתחו **GitHub Issue** במאגר הפרויקט עם תיאור הבעיה ושלבי השחזור.
לבעיה רגישה, ציינו זאת ב-Issue ואנו נתאם ערוץ דיווח פרטי.

---

## English

### Security & Privacy Overview

Voice Reader is a Chrome (Manifest V3) extension that reads selected text aloud in your browser.
It runs **fully locally** inside the browser:

- **No cloud server, no API, no user account, no sign-up.**
- **No telemetry, no analytics, no tracking.** No Google Analytics, `sendBeacon`, or any tracking service was found in the code.
- **No remote code.** All WASM (ONNX Runtime and Piper phonemize) is bundled inside the extension under `vendor/` and loaded only from `chrome-extension://`. No `eval`, no `new Function`, no remote script loading.
- **No access to cookies, passwords, or form fields.** The extension reads only the **selected text** (`window.getSelection()`) for synthesis.

#### The only network call

The **only** external network call is a one-time download of the neural voice model (Piper) from **HuggingFace**:

- URL: `https://huggingface.co/diffusionstudio/piper-voices/...`
- What is downloaded: the voice model file (`.onnx` + `.json`), ~63–75MB, once per voice.
- The model is cached locally in the browser's OPFS (Origin Private File System); after the first download the extension works **fully offline**.
- The download is **data-only** (a GET of a file). **No text of yours, no personal data, and no usage data is ever sent** to HuggingFace or any other destination.

The manifest `content_security_policy` enforces this at the browser level — `connect-src` allows only `'self'` and HuggingFace domains. Any attempt to reach any other host is blocked by the browser.

> Technical note: the bundled library (`vendor/piper/piper-tts-web.js`) contains inactive default constants pointing to cdnjs/jsdelivr for WASM files. Our code (`src/offscreen/offscreen.js`) **overrides** these defaults and points all WASM to the locally bundled package. The CSP also blocks those domains regardless.

### Permissions — why each is needed

| Permission | Why it is needed |
|------------|------------------|
| `contextMenus` | Adds the "Voice Read" right-click menu on selected text (Explanatory / Storytelling). |
| `storage` | Stores user preferences only — chosen engine, voice, speed, pitch, and captions state. No read content is stored. |
| `activeTab` | Operates on the active tab when the user triggers a read. |
| `scripting` | Injects the content script into tabs that were already open before the extension was installed/reloaded, so reading works immediately. |
| `offscreen` | Creates an offscreen document for audio playback and to run the Piper neural engine (MV3 does not allow audio playback in a service worker). |

> There are no separate `host_permissions`. The `content_scripts` match `<all_urls>` so you can read text on any site — but the script reads only the text you select and never touches cookies, passwords, or forms.

### Data handling

**No personal data is collected or transmitted.**

- Page content and selected text are never sent to any external server.
- No unique identifiers, no user tracking, no profiles.
- The only data stored is the **extension settings** (`vr_settings` in `chrome.storage.sync`, and the captions toggle in `chrome.storage.local`). This lives only in your browser / Google account and is used only by the extension.
- Selected text is passed only to the local offscreen document for voice synthesis, never to the network.

### Reporting a vulnerability

Found a security issue? Please open a **GitHub Issue** on the project repository describing the problem and reproduction steps.
For sensitive issues, note this in the Issue and we will arrange a private reporting channel.
