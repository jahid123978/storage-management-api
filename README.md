# Storage Management System API Documentation

## Base URL and Environment Variables

* **Base URL**:
  Each request is prefixed with:

  ```
  {{baseUrl}} ≔ https://storage-management-api-uqjx.onrender.com/
  ```

* **Common Headers**:
  For any protected endpoint, include:

  ```
  Authorization: Bearer <accessToken>
  ```

  All request and response bodies use `Content-Type: application/json` unless otherwise specified (e.g., multipart/form-data for file uploads).

---

## 1. Authentication Routes

> All authentication routes live under `/api/v1/auth`.

### 1.1. Register a New User

```
POST  /api/v1/auth/register
Content-Type: application/json
```

**Request Body**

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "P@ssw0rd"
}
```

**Success Response (201 Created)**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "60e6c4f4a2b3c81234d56ef1",
      "username": "alice",
      "email": "alice@example.com",
      "createdAt": "2025-05-20T12:34:56.789Z"
    },
    "tokens": {
      "accessToken": "<JWT_ACCESS_TOKEN>",
      "refreshToken": "<REFRESH_TOKEN>"
    }
  }
}
```

**Errors**

* `400 Bad Request` – validation failed (e.g., missing or invalid fields).
* `409 Conflict` – username or email already exists.

---

### 1.2. Login

```
POST  /api/v1/auth/login
Content-Type: application/json
```

**Request Body**

```json
{
  "email": "alice@example.com",
  "password": "P@ssw0rd"
}
```

**Success Response (200 OK)**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "60e6c4f4a2b3c81234d56ef1",
      "username": "alice",
      "email": "alice@example.com"
    },
    "tokens": {
      "accessToken": "<JWT_ACCESS_TOKEN>",
      "refreshToken": "<REFRESH_TOKEN>"
    }
  }
}
```

**Errors**

* `400 Bad Request` – missing fields.
* `401 Unauthorized` – invalid credentials.

---

### 1.3. Logout

```
POST  /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

* **Success Response (204 No Content)**

  ```json
  { "status": "success", "data": null }
  ```
* **Errors**

  * `401 Unauthorized` – missing/invalid token.

---

### 1.4. Forgot Password

```
POST  /api/v1/auth/forgot-password
Content-Type: application/json
```

**Request Body**

```json
{
  "email": "alice@example.com"
}
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "message": "If an account with that email exists, a password reset email was sent."
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – invalid email format.

---

### 1.5. Reset Password

```
POST  /api/v1/auth/reset-password?token=<resetToken>
Content-Type: application/json
```

**Request Body**

```json
{
  "newPassword": "NewP@ssw0rd"
}
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "message": "Password has been reset successfully."
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – missing `token` or `newPassword`.
  * `401 Unauthorized` – token invalid/expired.

---

### 1.6. Get Current User (Profile)

```
GET  /api/v1/auth/me
Authorization: Bearer <accessToken>
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": "60e6c4f4a2b3c81234d56ef1",
        "username": "alice",
        "email": "alice@example.com",
        "role": "user",
        "storageQuotaBytes": 1073741824,
        "usedStorageBytes": 524288000,
        "createdAt": "2025-05-20T12:34:56.789Z"
      }
    }
  }
  ```
* **Errors**

  * `401 Unauthorized` – missing/invalid token.

---

### 1.7. Change Password

```
PATCH  /api/v1/auth/me/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**

```json
{
  "currentPassword": "P@ssw0rd",
  "newPassword": "NewP@ssw0rd"
}
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "message": "Password changed successfully."
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – missing fields or `newPassword` too short.
  * `401 Unauthorized` – wrong `currentPassword`.

---

### 1.8. Change Username

```
PATCH  /api/v1/auth/me/change-username
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**

```json
{
  "password": "NewP@ssw0rd",
  "newUsername": "newalice"
}
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": "60e6c4f4a2b3c81234d56ef1",
        "username": "newalice",
        "email": "alice@example.com"
      }
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – missing fields.
  * `401 Unauthorized` – wrong `password`.
  * `409 Conflict` – `newUsername` already taken.

---

### 1.9. Delete Account

```
DELETE  /api/v1/auth/me/delete-account
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**

```json
{
  "password": "NewP@ssw0rd"
}
```

* **Success Response (204 No Content)**

  ```json
  { "status": "success", "data": null }
  ```
* **Errors**

  * `401 Unauthorized` – wrong `password` or invalid token.

---

## 2. Storage Quota & Usage

> Endpoints under `/api/v1/storage` are protected. Provide `Authorization: Bearer <accessToken>`.

### 2.1. Get Storage Quota

```
GET  /api/v1/storage/quota
Authorization: Bearer <accessToken>
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "storageQuotaBytes": 1073741824,
      "usedStorageBytes": 524288000,
      "availableStorageBytes": 549453824,
      "usedStorageHuman": "500.00 MiB",
      "quotaHuman": "1.00 GiB",
      "availableHuman": "524.00 MiB"
    }
  }
  ```
* **Errors**

  * `401 Unauthorized`.

---

### 2.2. Get Storage Overview (by Type)

```
GET  /api/v1/storage/overview
Authorization: Bearer <accessToken>
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "note":  { "count": 24, "totalSizeBytes": 24576, "averageSizeBytes": 1024 },
      "image": { "count": 10, "totalSizeBytes": 104857600, "averageSizeBytes": 10485760 },
      "pdf":   { "count": 6,  "totalSizeBytes": 314572800, "averageSizeBytes": 52428800 },
      "folder":{ "count": 12, "totalSizeBytes": 444444, "averageSizeBytes": 37037 }
    }
  }
  ```
* **Errors**

  * `401 Unauthorized`.

---

## 3. Item Routes

> All item-related routes live under `/api/v1/items`.
> Protected: require `Authorization: Bearer <accessToken>`.

### 3.1. List & Filter Items

```
GET  /api/v1/items
Authorization: Bearer <accessToken>
```

**Optional Query Parameters**

* `page` (integer ≥ 1, default=1)
* `limit` (integer, default=20, max=100)
* `sortBy` (`createdAt`/`name`/`sizeBytes`, default=`createdAt`)
* `order` (`asc`/`desc`, default=`desc`)
* `parentFolderId` (ObjectId or `null`)
* `type` (`note`/`image`/`pdf`)
* `search` (text search on `name`/`noteContent`)
* `dateFrom` / `dateTo` (ISO date, filter by `createdAt`)

**Success Response (200 OK)**

```json
{
  "status": "success",
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 42,
    "totalPages": 3
  },
  "data": [
    {
      "id": "60e6c5e4b3a4d01234d56ef2",
      "type": "note",
      "name": "Meeting Notes",
      "sizeBytes": 2048,
      "parentFolderId": null,
      "isFavorite": false,
      "isShared": true,
      "createdAt": "2025-05-22T14:00:00.000Z",
      "updatedAt": "2025-05-23T10:15:00.000Z"
    },
    {
      "id": "60e6c6f7d7f3e71234d56ef3",
      "type": "image",
      "name": "VacationPhoto.jpg",
      "sizeBytes": 5242880,
      "parentFolderId": null,
      "isFavorite": true,
      "isShared": false,
      "createdAt": "2025-05-20T09:30:00.000Z",
      "updatedAt": "2025-05-20T09:30:00.000Z"
    }
    // … up to `limit` items
  ]
}
```

* **Errors**

  * `400 Bad Request` – invalid query parameters.
  * `401 Unauthorized`.

---

### 3.2. Count & Usage by Type

```
GET  /api/v1/items/count-usage
Authorization: Bearer <accessToken>
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "note":  { "count": 24, "totalSizeBytes": 24576, "averageSizeBytes": 1024 },
      "image": { "count": 10, "totalSizeBytes": 104857600, "averageSizeBytes": 10485760 },
      "pdf":   { "count": 6,  "totalSizeBytes": 314572800, "averageSizeBytes": 52428800 }
    }
  }
  ```
* **Errors**

  * `401 Unauthorized`.

---

### 3.3. Get Single Item

```
GET  /api/v1/items/:itemId
Authorization: Bearer <accessToken>
```

* **Path Parameters**

  * `:itemId` — MongoDB ObjectId of the item.
* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "id": "60e6c5e4b3a4d01234d56ef2",
      "userId": "60e6c4f4a2b3c81234d56ef1",
      "type": "note",
      "name": "Meeting Notes",
      "noteContent": "Here are the meeting minutes: …",
      "sizeBytes": 2048,
      "parentFolderId": null,
      "isFavorite": false,
      "isShared": true,
      "pinProtected": false,
      "createdAt": "2025-05-22T14:00:00.000Z",
      "updatedAt": "2025-05-23T10:15:00.000Z"
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – invalid `itemId` format.
  * `401 Unauthorized`.
  * `403 Forbidden` – neither owner nor shared with permission.
  * `404 Not Found` – `itemId` does not exist.

---

### 3.4. Create a Note

```
POST  /api/v1/items/note
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "Project Plan",
  "noteContent": "Initial draft of the project plan: …",
  "parentFolderId": null,          // or a valid ObjectId
  "pinProtected": false,           // optional, default=false
  "pin": ""                       // required only if pinProtected=true
}
```

* **Success Response (201 Created)**

  ```json
  {
    "status": "success",
    "data": {
      "id": "60e6c7e1dcd7b11234d56ef4",
      "type": "note",
      "name": "Project Plan",
      "noteContent": "Initial draft of the project plan: …",
      "sizeBytes": 4096,
      "parentFolderId": null,
      "isFavorite": false,
      "isShared": false,
      "pinProtected": false,
      "createdAt": "2025-05-26T08:00:00.000Z",
      "updatedAt": "2025-05-26T08:00:00.000Z"
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – missing/invalid fields or `parentFolderId` not owned by user.
  * `401 Unauthorized`.
  * `413 Payload Too Large` – if note content exceeds size limit.

---

### 3.5. Upload an Image

```
POST  /api/v1/items/image
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form‐Data Fields**

* `name` (string, required)
* `parentFolderId` (string, ObjectId or empty for root)
* `pinProtected` (boolean, optional)
* `pin` (string, 4–6 digits, required if `pinProtected=true`)
* `file` (file, required; JPEG/PNG; max 5 MB)

**Success Response (201 Created)**

```json
{
  "status": "success",
  "data": {
    "id": "60e6c8f3ac9dcd1234d56ef5",
    "type": "image",
    "name": "Sunset.jpg",
    "fileUrl": "/uploads/60e6c4f4a2b3c81234d56ef1/images/1622060403075-123456789.jpg",
    "thumbnailUrl": "/uploads/60e6c4f4a2b3c81234d56ef1/images/thumb-1622060403075-123456789.jpg",
    "fileMimeType": "image/jpeg",
    "sizeBytes": 1452863,
    "parentFolderId": null,
    "isFavorite": false,
    "isShared": false,
    "pinProtected": false,
    "createdAt": "2025-05-26T08:10:00.000Z",
    "updatedAt": "2025-05-26T08:10:00.000Z"
  }
}
```

* **Errors**

  * `400 Bad Request` – missing `file` or `name`.
  * `401 Unauthorized`.
  * `413 Payload Too Large` – if file > 5 MB.
  * `415 Unsupported Media Type` – if not JPEG/PNG.

---

### 3.6. Upload a PDF

```
POST  /api/v1/items/pdf
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form‐Data Fields**

* `name` (string, required)
* `parentFolderId` (string, ObjectId or empty)
* `pinProtected` (boolean, optional)
* `pin` (string, 4–6 digits, required if `pinProtected=true`)
* `file` (file, required; PDF; max 5 MB)

**Success Response (201 Created)**

```json
{
  "status": "success",
  "data": {
    "id": "60e6c9a7dc9e2c1234d56ef6",
    "type": "pdf",
    "name": "ProjectSpecification.pdf",
    "fileUrl": "/uploads/60e6c4f4a2b3c81234d56ef1/pdfs/1622060507693-987654321.pdf",
    "fileMimeType": "application/pdf",
    "sizeBytes": 3456789,
    "parentFolderId": null,
    "isFavorite": false,
    "isShared": false,
    "pinProtected": false,
    "createdAt": "2025-05-26T08:15:00.000Z",
    "updatedAt": "2025-05-26T08:15:00.000Z"
  }
}
```

* **Errors**

  * `400 Bad Request` – missing required fields.
  * `401 Unauthorized`.
  * `413 Payload Too Large` – file > 5 MB.
  * `415 Unsupported Media Type` – file not PDF.

---

### 3.7. Update an Item

```
PUT  /api/v1/items/:itemId
Authorization: Bearer <accessToken>
Content-Type: application/json
```

* **Path Parameters**

  * `:itemId` — ObjectId of the item.
* **Request Body (any combination of fields)**

  ```json
  {
    "name": "Updated Name",
    "parentFolderId": "60e6cd12ab345c1234d56ef7",  
    "noteContent": "Updated text...",        // only if type=note
    "pinProtected": true,                    // optional toggle
    "pin": "1234"                            // required if enabling PIN
  }
  ```
* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "id": "60e6c5e4b3a4d01234d56ef2",
      "type": "note",
      "name": "Revised Meeting Notes",
      "noteContent": "Updated notes: …",
      "sizeBytes": 3072,
      "parentFolderId": "60e6cd12ab345c1234d56ef7",
      "isFavorite": false,
      "isShared": true,
      "pinProtected": false,
      "updatedAt": "2025-05-26T09:00:00.000Z"
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – invalid fields or `parentFolderId` mismatch.
  * `401 Unauthorized`.
  * `403 Forbidden` – no permission.
  * `404 Not Found` – item does not exist.

---

### 3.8. Delete an Item

```
DELETE  /api/v1/items/:itemId
Authorization: Bearer <accessToken>
```

* **Path Parameters**

  * `:itemId` — ObjectId of the item.
* **Success Response (204 No Content)**

  ```json
  { "status": "success", "data": null }
  ```
* **Behavior**

  * If it’s a folder, all nested children are deleted recursively.
  * For images/PDFs, associated files and thumbnails are removed from storage.
  * Updates user’s `usedStorageBytes` accordingly.
* **Errors**

  * `400 Bad Request` – invalid `itemId`.
  * `401 Unauthorized`.
  * `403 Forbidden` – not owner.
  * `404 Not Found` – item not found.

---

### 3.9. Copy / Duplicate an Item

```
POST  /api/v1/items/:itemId/copy
Authorization: Bearer <accessToken>
Content-Type: application/json
```

* **Path Parameters**

  * `:itemId` — ObjectId of the source item.
* **Request Body**

  ```json
  {
    "targetFolderId": "60e6cb12ef34561234d56efa",   // optional parent folder
    "newName": "Copied Item Name"                   // optional; defaults to "<Name> (Copy)"
  }
  ```
* **Success Response (201 Created)**

  ```json
  {
    "status": "success",
    "data": {
      "copiedItemId": "60e6ccb7f1234f1234d56ef8",
      "message": "Item and all nested children copied successfully."
    }
  }
  ```
* **Behavior**

  * Recursively copies folders & children, duplicating file binaries (images/PDFs) on disk/cloud.
  * Updates storage usage for the new copies.
* **Errors**

  * `400 Bad Request` – invalid `targetFolderId`.
  * `401 Unauthorized`.
  * `403 Forbidden` – not owner or cannot edit (if shared).
  * `404 Not Found` – original item not found.
  * `409 Conflict` – name collision (if your logic disallows duplicates).

---

### 3.10. Share an Item

```
POST  /api/v1/items/:itemId/share
Authorization: Bearer <accessToken>
Content-Type: application/json
```

* **Path Parameters**

  * `:itemId` — ObjectId of the item to share.
* **Request Body**

  ```json
  {
    "sharedWithUserId": "60e6cf56abcd1234123456ef8",
    "canEdit": false,
    "canFavorite": true
  }
  ```
* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "message": "Item successfully shared with user 60e6cf56abcd1234123456ef8"
    }
  }
  ```
* **Behavior**

  * Owner only. Creates or updates a `SharedPermission` entry.
  * Sets `item.isShared = true`.
* **Errors**

  * `400 Bad Request` – invalid IDs.
  * `401 Unauthorized`.
  * `403 Forbidden` – not owner.
  * `404 Not Found` – item or target user not found.

---

### 3.11. Revoke Sharing

```
DELETE  /api/v1/items/:itemId/share/:sharedWithUserId
Authorization: Bearer <accessToken>
```

* **Path Parameters**

  * `:itemId` — ObjectId of the shared item.
  * `:sharedWithUserId` — ObjectId of the user to revoke.
* **Success Response (204 No Content)**

  ```json
  { "status": "success", "data": null }
  ```
* **Behavior**

  * Owner only. Removes the `SharedPermission` entry.
  * If no more shares exist for this `itemId`, sets `item.isShared = false`.
* **Errors**

  * `401 Unauthorized`.
  * `403 Forbidden` – not owner.
  * `404 Not Found` – no such share entry.

---

### 3.12. Toggle Favorite

```
POST  /api/v1/items/:itemId/favorite
Authorization: Bearer <accessToken>
Content-Type: application/json
```

* **Path Parameters**

  * `:itemId` — ObjectId of the item.
* **Request Body (optional)**

  ```json
  {
    "favorite": true    // true = set favorite; false = unset; omit to toggle
  }
  ```
* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "id": "60e6c5e4b3a4d01234d56ef2",
      "type": "note",
      "name": "Meeting Notes",
      "isFavorite": true
    }
  }
  ```
* **Behavior**

  * Owners or shared users with `canFavorite = true`.
  * Updates `item.isFavorite`.
* **Errors**

  * `400 Bad Request` – invalid payload.
  * `401 Unauthorized`.
  * `403 Forbidden` – no permission.
  * `404 Not Found` – item not found.

---

### 3.13. Calendar‐Grouped Items

```
GET  /api/v1/items/calendar?period={period}&date={ISO_date}
Authorization: Bearer <accessToken>
```

* **Query Parameters**

  * `period` (required): `day` / `week` / `month`
  * `date` (optional, default=“today”): ISO 8601 date string (e.g., `2025-05-01`)
  * `type` (optional): `note` / `image` / `pdf`

* **Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "period": "week",
      "startDate": "2025-05-19",
      "endDate": "2025-05-25",
      "itemsByDate": {
        "2025-05-19": [
          { "id": "60e6d3f45a6b91234d56ef13", "type": "note", "name": "Sprint Retrospective" },
          { "id": "60e6d41e789d111234d56ef14", "type": "image", "name": "TeamPhoto.png" }
        ],
        "2025-05-20": [
          { "id": "60e6d456cdef321234d56ef16", "type": "pdf", "name": "Budget2025.pdf" }
        ]
        // … other dates in the period
      }
    }
  }
  ```

* **Errors**

  * `400 Bad Request` – invalid `period` or `date`.
  * `401 Unauthorized`.

---

## 4. Folder Routes

> All folder‐related routes reside under `/api/v1/folders`.
> Protected: require `Authorization: Bearer <accessToken>`.

### 4.1. Create a Folder

```
POST  /api/v1/folders
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "Project Documents",
  "parentFolderId": null,      // or a valid folder ObjectId
  "pinProtected": false,       // optional
  "pin": ""                   // required if pinProtected=true
}
```

* **Success Response (201 Created)**

  ```json
  {
    "status": "success",
    "data": {
      "id": "60e6cb12ef34561234d56efa",
      "name": "Project Documents",
      "parentFolderId": null,
      "pinProtected": false,
      "createdAt": "2025-05-26T09:30:00.000Z",
      "updatedAt": "2025-05-26T09:30:00.000Z"
    }
  }
  ```
* **Errors**

  * `400 Bad Request` – missing or invalid fields.
  * `401 Unauthorized`.
  * `409 Conflict` – a sibling folder with the same `name` already exists.

---

### 4.2. List Folders (by Parent)

```
GET  /api/v1/folders?parentFolderId={ObjectId|null}&page={n}&limit={n}
Authorization: Bearer <accessToken>
```

* **Query Parameters**

  * `parentFolderId`: ObjectId of a parent, or `null` (default) to list root‐level.
  * `page` (integer ≥ 1, default=1)
  * `limit` (integer, default=20)

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 5,
      "totalPages": 1
    },
    "data": [
      {
        "id": "60e6cb12ef34561234d56efa",
        "name": "Project Documents",
        "parentFolderId": null,
        "pinProtected": false,
        "createdAt": "2025-05-26T09:30:00.000Z",
        "updatedAt": "2025-05-26T09:30:00.000Z"
      }
      // … more folders
    ]
  }
  ```

* **Errors**

  * `400 Bad Request` – invalid `parentFolderId`.
  * `401 Unauthorized`.

---

### 4.3. Update a Folder

```
PATCH  /api/v1/folders/:folderId
Authorization: Bearer <accessToken>
Content-Type: application/json
```

* **Path Parameters**

  * `:folderId` — ObjectId of the folder to update.

* **Request Body (any of these fields)**

  ```json
  {
    "name": "Client Deliverables",
    "parentFolderId": null,       // move to a different parent
    "pinProtected": false,        // enable/disable PIN
    "pin": "1234"               // required if pinProtected=true
  }
  ```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "id": "60e6cb12ef34561234d56efa",
      "name": "Client Deliverables",
      "parentFolderId": null,
      "pinProtected": false,
      "updatedAt": "2025-05-26T10:00:00.000Z"
    }
  }
  ```

* **Errors**

  * `400 Bad Request` – invalid fields or moving into a descendant (cycle).
  * `401 Unauthorized`.
  * `403 Forbidden` – not owner.
  * `404 Not Found` – folder not found.
  * `409 Conflict` – new `name` already exists among siblings.

---

### 4.4. Delete a Folder

```
DELETE  /api/v1/folders/:folderId
Authorization: Bearer <accessToken>
```

* **Path Parameters**

  * `:folderId` — ObjectId of the folder to delete.

* **Success Response (204 No Content)**

  ```json
  { "status": "success", "data": null }
  ```

* **Behavior**

  * Recursively deletes all subfolders and items inside.
  * Cleans up associated files from disk/cloud and updates user’s used storage.

* **Errors**

  * `400 Bad Request` – invalid `folderId`.
  * `401 Unauthorized`.
  * `403 Forbidden` – not owner.
  * `404 Not Found` – folder not found.

---

## 5. Health Check

```
GET  /api/v1/health
```

* **Success Response (200 OK)**

  ```json
  {
    "status": "success",
    "data": {
      "uptime": 123456.78,
      "timestamp": "2025-05-26T10:30:00.000Z"
    }
  }
  ```
* **No authentication required.**

---

## 6. Error Codes (Standardized)

All error responses follow this format:

```json
{
  "status": "error",
  "error": {
    "code": "<ERROR_CODE>",
    "message": "<Human-readable error message>"
  }
}
```

Common `error.code` values:

| HTTP Status | error.code               | Example Message                                       |
| ----------- | ------------------------ | ----------------------------------------------------- |
| 400         | `INVALID_INPUT`          | “One or more required fields are missing.”            |
| 400         | `INVALID_FILE_TYPE`      | “Uploaded file type not supported.”                   |
| 400         | `INVALID_FILE_SIZE`      | “File exceeds the maximum allowed size of 5 MB.”      |
| 401         | `UNAUTHORIZED`           | “Authentication required or token is missing.”        |
| 401         | `INVALID_TOKEN`          | “The access token provided is invalid or expired.”    |
| 401         | `INVALID_PIN`            | “The provided PIN is incorrect.”                      |
| 403         | `FORBIDDEN`              | “You do not have permission to access this resource.” |
| 404         | `NOT_FOUND`              | “Requested resource not found.”                       |
| 409         | `CONFLICT`               | “Resource conflict: e.g., name already exists.”       |
| 413         | `PAYLOAD_TOO_LARGE`      | “Uploaded file is too large.”                         |
| 415         | `UNSUPPORTED_MEDIA_TYPE` | “Unsupported media type.”                             |
| 429         | `RATE_LIMIT_EXCEEDED`    | “Too many requests. Please try again later.”          |
| 500         | `INTERNAL_SERVER_ERROR`  | “An unexpected error occurred.”                       |

---

**Tips for Testing**

1. After registering a user and logging in, copy the returned `accessToken` into Postman’s “Authorization → Bearer Token” field.
2. When creating items (notes/images/PDFs), verify `usedStorageBytes` via **Storage → Get Quota**.
3. Use the Calendar endpoint to view items created within a specific day/week/month.
4. Handle pagination on list endpoints (`Items: List Items`, `Folders: List Folders`) by supplying `page` and `limit`.

---

Feel free to adjust example payloads or add more details (e.g., sample Responses for error cases) as needed. This documentation should serve as a complete reference for any developer consuming or testing your RESTful API.



 ## Setup
 1. Clone the repository
 2. Install dependencies: `npm install`
 3. Copy `.env.example` to `.env` and fill in values
 4. Run in development: `npm run dev`
 5. Production: `npm start`

 ## Features
 - User Authentication (JWT)
 - CRUD operations for Notes, Images, PDFs, Folders
 - File uploads (Multer, local or cloud)
 - Copy/Duplicate items (including nested folders)
 - Share items with other users (permissions)
 - Favorite/unfavorite items
 - Calendar view grouping by date
 - Storage quota management
 - Optional PIN protection for items/folders

 ## Tech Stack
 - Node.js, Express.js, MongoDB, Mongoose
 - JWT, bcrypt for security
 - Multer, Sharp for file uploads and image processing
 - Nodemailer for email
 - Joi for validation
 - Helmet, express-rate-limit, CORS for security
