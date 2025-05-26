# Storage Management System API

 Live link: https://storage-management-api-uqjx.onrender.com/

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
