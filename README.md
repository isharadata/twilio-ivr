Installation
++++++++++++

Prerequisites
=============

MySQL
------
Install MySQL and run it

Get/create a username and password for MySQL

Twilio
------
Register a twilio account

Obtain a twilio programmable voice phone number

Enable programmable voice destinations that you want to call/use

Create a new flow

import the "twilio-ivr-flow.json" in the project folder root into the flow

edit the "call_user"1" which makes the outbound call and set the "Recording Status Callback URL" to the address of the nodejs server
to "{server address}/recording-events?flowsid={{flow.sid}}"
*(Edit this when you have run the nodejs server and obtained the address and port)

Create an authtoken and note the accountSid and authToken. Replace twAccountSid and twAuthToken in server/index.js

Replace twFlowId in "server/index.js" with the flowId of the flow you created

Replace "twOutgoingPhone" with the programmable phone number registered


Google Drive
------------
Create a shared folder in google drive which is available to anyone who has the link as editor and copy the link

Edit "server/index.js" and set "GDRIVE_FOLDER_ID" to the alphanumeric id in the google drive shared folder link

Create a service account by following this guide: https://dev.to/mearjuntripathi/upload-files-on-drive-with-nodejs-15j2

Obtain the json and copy it into the "server" folder as apikeys.json

Server
=======

Update dbUser and dbPass in server/index.js

cd into server folder

run "npm install" to install required nodejs packages

run "nodejs index.js" to run the backend

Client
=======

In a new terminal

cd into the project root folder

run "npm create vite@latest client -- --template react" to install basic react and vuejs packages
*Choose ignore files when prompted

copy all the files and folders from "client1" folder into the "client" folder you created overwriting any files

Edit client/AppContext.js and update baseUrl to your ip address if you are not accessing it from localhost
*If you are only running on localhost you can ignore the baseUrl

run "npm install" to install required packages

run "npm run dev" to run the frontend in dev mode
Alternatively to run in production mode run "npm run build" followed by "npm run preview" 

Note the server address and ensure it is accessible from the web
*Use this to set the recording callback in the twilio setup above