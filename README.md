### Student Records Management System

### Group Project – COMP S381F (Autumn 2025)

#### \## 1. Project Information

**Project Name:** Student Records Management System

**Cloud URL:** https://student-records-fd69.onrender.com

**Group Number:** 6

**Team Leader:** Duan Lei （12802720）；

**Team Members:** Wong Chi Shing (13044648);  Cheung Hiu Ying (13146075)

This server-side application allows administrators to manage student records through both Web UI and RESTful API services. The application supports secure login, CRUD operations, Google OAuth authentication, and is deployed to Render cloud service.



#### \## 2. Project File Introduction

###### **server.js**

**Main server application providing:**

Express.js server setup

Session management

Google OAuth login (Passport)

Admin login (local session)

MongoDB Atlas connection (Mongoose)

CRUD Web UI routing

RESTful CRUD API routing

EJS view rendering



###### **package.json**

###### Includes:

Dependencies: express, mongoose, passport, passport-google-oauth20, ejs, dotenv

Script: "start": "node server.js" for Render deployment



###### **views：**

Contains EJS templates:

layout.ejs – Main layout structure

students.ejs – Student list

add.ejs – Add student

edit.ejs – Edit student

login.ejs – Login page



###### **models：**

Contains the Mongoose schema for students:

Student.js – Defines studentID, name, age, major, gpa



###### **public：**

Static content folder for CSS, JS, images (if applicable)



#### \## 3. Cloud-Based Server URL



https://student-records-fd69.onrender.com

This link is provided for login, CRUD operations, and testing RESTful APIs.



#### \## 4. Operation Guides

##### 

##### \### 4.1 Login / Logout



**Admin Login (Local Session)**

Visit login

Enter the following credentials:

Username: admin

Password: 123456

Successful login redirects to students.



**Google OAuth Login**

Click Login with Google

Complete Google OAuth flow

Redirect to students



**Logout**

Access /logout

Added security measures. That is, after clicking "logout", even if you click the browser's "back" button to return to the main page, any modifications will be forced to require re-verification of identity.



#### \### 4.2 CRUD Web Pages



**Read Students**

Visit: students

Allows:

List all students

Search by studentID / name / major（The student number must be entered as an exact eight-digit number. The name and major do not need to be entered completely and no consideration should be given to case sensitivity.）



**Create Student**

Visit: add

Input fields:

studentID (8 digits)

name

age

major

gpa



**Edit Student**

Visit: edit

Allows updating all student fields.



**Delete Student**

Visit: delete

Deletes record permanently.



#### \## 5. RESTful CRUD API Services (No Authentication Required)

Below are the APIs required by the project spec (GET / POST / PUT / DELETE).All return JSON response.

Base URL: https://student-records-fd69.onrender.com/api/students



###### \### (1) GET – List All Students

URL: GET /api/students



###### \### (2) GET – Find Student by MongoDB ID

URL: GET /api/students/:id



###### \### (3) POST – Create a New Student

URL: POST /api/students

Body example (JSON):

{

  "studentID": "12345678",

  "name": "John Doe",

  "age": 20,

  "major": "IT",

  "gpa": 3.5

}



###### \### ✔ (4) PUT – Update a Student

URL: PUT /api/students/:id

Body example:

{

  "major": "Computer Science",

  "gpa": 3.9

}



###### \### ✔ (5) DELETE – Delete a Student

URL: DELETE /api/students/:id





#### \## 6. CURL Commands for Testing (Demo-Ready)



**GET – Retrieve all students**

Invoke-RestMethod -Uri "https://student-records-fd69.onrender.com/api/students"


**POST – Create a new student**

Invoke-RestMethod -Method Post `
-Uri "https://student-records-fd69.onrender.com/api/students" `
-ContentType "application/json" `
-Body '{"studentID":"88881234","name":"Rest User","age":21,"major":"IT","gpa":3.1}'


**PUT – Update student information**

Invoke-RestMethod -Method Put `
    -Uri "https://student-records-fd69.onrender.com/api/students/6911d95daa0d9b00902dbc38" `
    -ContentType "application/json" `
    -Body '{ "major": "AI", "gpa": 4.0 }'


**DELETE – Remove a student**

Invoke-RestMethod -Method Delete `
    -Uri "https://student-records-fd69.onrender.com/api/students/6911eb0216b739624a8f9a6b"


#### \## 7. Notes



node\_modules folder is removed for submission

Application auto-deploys from GitHub main branch

All cloud functions tested and verified working

MongoDB Atlas database is online and connected












