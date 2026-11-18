# MediConnect Expo Frontend

A responsive Expo / React Native mobile frontend aligned to the MediConnect backend route contract and role model.

## Technology

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript
- Expo Router for navigation
- `expo-secure-store` for access-token storage
- `react-native-webview` for the Botpress Webchat embed
- `expo-document-picker` for lab report attachments
- `expo-notifications` for registering the device's Expo push token
- `@expo/vector-icons` for the icon system

## Brand palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#EAF7FB` | Main app background |
| `surfaceSoft` | `#BFEAF2` | Soft surfaces and selected cards |
| `highlight` | `#63C9D6` | Highlights and secondary emphasis |
| `primary` | `#1E7F8C` | Main actions, links, selected navigation |
| `ink` | `#20343A` | Headings and body text |

## 1. Connect to your backend

Create a `.env` file in this project root (copy `.env.example`) and set `EXPO_PUBLIC_API_URL` to the full backend API base URL, including `/api`.

```env
# Android Studio emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api

# iOS simulator
# EXPO_PUBLIC_API_URL=http://localhost:5000/api

# Physical phone: use your computer's LAN IPv4 address, on the same Wi-Fi
# EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api
```

Do not use `localhost` from a physical phone; it points to the phone itself. The backend must be running and reachable on the network. The Express backend's `CLIENT_ORIGIN` / CORS settings must allow the Expo development origin if the backend applies origin restrictions.

## 2. Install and run

Use Node.js 22.13+ and npm for this Expo SDK 57 project.

```bash
npm install
npx expo install --fix
npx expo-doctor
npx expo start
```

Scan the QR code with a compatible Expo Go app for UI and API development. Remote push notification support on Android is not available in Expo Go; a development build is required for remote push testing. The notification inbox itself uses the backend's MongoDB records and works independently of push delivery.

For a development build:

```bash
npx expo install expo-dev-client
eas build --profile development --platform android
```

Then start the Metro bundler with:

```bash
npx expo start --dev-client
```

For Android/iOS production binaries, configure EAS Build credentials and your app identifiers in `app.json` first.

## 3. Authentication flow

1. Patient registration calls `POST /api/auth/register`. The backend always creates a `patient` account; the client never sends a staff role.
2. Sign-in calls `POST /api/auth/login` with `email`, `password`, and `idCardNumber`.
3. The backend emails an OTP and returns a `challengeId`.
4. The OTP screen calls `POST /api/auth/verify-otp` with `challengeId` and the six-digit `otp`.
5. The returned JWT is stored using Expo SecureStore. Protected API requests use `Authorization: Bearer <token>`.
6. On app launch, the frontend validates the saved session with `GET /api/auth/me`.

## 4. Role-based experience

The frontend uses the exact case-sensitive role values from the backend:

- `patient`: appointment booking / rescheduling / cancellation, own medical records and AI outputs, medicine catalogue, profile and notifications.
- `doctor`: own appointments, availability management, authorized patient lookup and prescription creation.
- `diagnosis_lab_manager`: authorized patient lookup, lab report upload, general report storage and JPG/PNG chest X-ray inference workflow.
- `medicine_manager`: medicine catalogue administration, create/update/stock changes, low-stock and expired views.
- `admin`: user role and active-status management, all appointments, medicine inventory and authorized record lookup.

Role checks in the UI improve navigation and reduce accidental actions; the backend remains the authority for authentication and authorization.

## 5. Main navigation

The bottom tab bar contains:

- Home: role-specific dashboard and quick actions.
- Workspace / Care: role-specific operational tools.
- Ask AI: the raised centre button; loads the Botpress Webchat inside a native WebView.
- Records: own records for patients; ID-card lookup for staff.
- Profile: personal details, password-confirmed updates and sign-out. Staff workspaces expose record edits only to the record creator (or admin), editable medicine details/stock to medicine managers/admins, doctor slot editing/deletion for unbooked future slots, and admin account-field/role/status management.

The AI screen embeds the user's Botpress v5.0 snippet and uses `window.botpress.open()` after Webchat initialization. The code is not treated as a native React Native component; WebView is the bridge for this browser-based widget.

## 6. Backend API mapping

All API calls use the configured base URL and unwrap the backend response envelope `{ success, message, data }`.

| Frontend feature | Backend endpoints |
|---|---|
| Health check (optional) | `GET /api/health` |
| Registration | `POST /api/auth/register` |
| Login + OTP | `POST /api/auth/login`, `POST /api/auth/verify-otp`, `POST /api/auth/resend-otp` |
| Own profile | `GET /api/auth/me`, `PATCH /api/auth/me` |
| Doctors / available slots | `GET /api/slots/doctors`, `GET /api/slots/doctors/:doctorId/slots` |
| Create doctor availability | `POST /api/slots/availability` |
| Book / list / reschedule / cancel | `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/all`, `PATCH /api/bookings/:slotId/reschedule`, `DELETE /api/bookings/:slotId` |
| Medicine catalogue | `GET /api/medicines`, `GET /api/medicines/low-stock`, `GET /api/medicines/expired` |
| Medicine management | `POST /api/medicines`, `PATCH /api/medicines/:id`, `PATCH /api/medicines/:id/stock`, `DELETE /api/medicines/:id` |
| Own / patient records | `GET /api/records/my`, `GET /api/records/patient/:idCardNumber` |
| Lab report upload + AI | `POST /api/records/lab-reports` (multipart `file`, `idCardNumber`, `reportType`, `title`, `diagnosis`, `notes`) |
| Prescription | `POST /api/records/prescriptions` |
| Record file viewing | `GET /api/records/:recordId/file` |
| Notifications | `GET /api/notifications/me`, `PATCH /api/notifications/:notificationId/read`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications/:notificationId`, `POST /api/notifications/device-token` |
| Admin users | `GET /api/admin/users`, `PATCH /api/admin/users/role`, `PATCH /api/admin/users/active` |

## 7. AI report flow

1. A diagnosis lab manager or admin selects the patient, report type and file.
2. For `chest_xray`, the frontend restricts the selection to image types and validates JPEG/PNG before sending.
3. The frontend sends multipart form data to `POST /api/records/lab-reports`.
4. Express stores the original report using the configured file-storage service, then forwards the image bytes to the existing FastAPI `/predict` endpoint.
5. The backend saves the report and any AI response in `MedicalRecord.aiPrediction`.
6. The patient and authorized staff read the saved result from the records API.

The frontend describes the model response as decision support only. It does not present an AI output as a confirmed diagnosis, treatment recommendation or substitute for a clinician.

## 8. Editing and deletion rules reflected in the UI

- Patients can update their own profile only after providing their current password. An admin can edit a user's name, email, ID-card number and optionally reset the password through `PATCH /api/admin/users/:userId`; role and active status have dedicated admin routes. Account deactivation is preferred to hard deletion.
- Doctors can edit/archive only prescriptions they created. Diagnosis lab managers can edit/archive only lab reports they created. Admins can edit/archive any medical record. The backend enforces these rules; the frontend only displays edit/archive controls when the returned uploader metadata indicates the user may own the record.
- Medicine managers and admins can create, edit, adjust stock, deactivate/reactivate and delete inventory items. Stock changes use the dedicated `PATCH /api/medicines/:id/stock` operation.
- Doctors can create availability windows, edit unbooked future slots and remove unbooked future slots. Booked slots are changed through booking cancellation/rescheduling workflows rather than direct slot edits.
- Patients can book/reschedule their own upcoming appointments. Patients, doctors and admins can cancel bookings subject to the backend ownership checks.

## 9. Important backend constraints reflected in the UI

- The backend does not currently expose pharmacy ordering, cart, payments or medicine delivery endpoints. The frontend therefore provides inventory browsing and staff stock controls only.
- The backend models appointments as doctor `Slot` records with `available` / `booked` status, not a standalone Appointment collection.
- Patient profile changes require the current password; that requirement is reflected in the Profile screen.
- Patients can read their own records. Staff lookup uses the ID-card-number route, whose backend helper checks whether the staff member has an authorized care context.
- The `POST /api/slots/availability` handler in the supplied backend source does not itself check that `req.user.role === 'doctor'`, even though the intended role is doctor. Add a backend role guard before production.
- The `GET /api/bookings/all` route is described as admin-only in the intended contract, but the supplied route handler does not contain its own explicit admin check. Ensure the backend authorization guard is present before production. Do not rely on frontend role hiding for security.

## 10. Push notifications

The Notification screen requests device permission, gets an Expo push token, and registers it with `POST /api/notifications/device-token`. In-app notifications are loaded from MongoDB through `/api/notifications/me`; they are independent of whether remote push delivery is configured. Set a real EAS project ID in `app.json` before testing token registration. Android remote push notifications require a development/release build rather than Expo Go.

## 11. Production hardening checklist

- Use an HTTPS backend URL and a restrictive CORS allow-list.
- Keep all backend credentials, JWT secrets, SMTP credentials, ImageKit private keys and ML keys on the backend only.
- Never put passwords, OTPs, JWT secrets or the FastAPI model key in `EXPO_PUBLIC_*` variables.
- Validate the backend permissions for every route; frontend role-based navigation is not a security boundary.
- Set the real EAS `projectId`, configure push credentials and test notification receipt on physical devices.
- Test file downloads on Android and iOS, and ensure the backend download endpoint returns the correct authorized file.
- Test the Botpress embed with the bot published and its domain/embed settings enabled.
- Test network access from physical phones using a LAN IP during local development.
- Perform end-to-end tests for OTP, bookings (including double booking), rescheduling, stock edits, records, file access and role-denied requests.
- Complete clinical validation, privacy review, data retention and incident-response planning before real patient use.

## 12. Notes

This frontend was generated against the `MediConnect_Backend_Starter.zip` supplied in the conversation and its README/API handlers. It cannot verify your live MongoDB, Gmail SMTP, ImageKit, FastAPI, Expo push or Botpress deployments from source alone. Validate each integration against your running backend. No AI model weights or backend secrets are included in this frontend project.

## 13. Build verification status

The project source was checked for TypeScript/TSX syntax errors (31 files) and the `package.json`, `app.json`, and `eas.json` files were parsed successfully. A full `tsc --noEmit`, Metro bundle, `expo-doctor`, or physical-device test could not be completed in the generation environment because access to the npm registry failed with a DNS/network error. Run the install and validation commands in section 2 on your development computer before treating this build as device-tested.
