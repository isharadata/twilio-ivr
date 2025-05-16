const express = require('express');
const server = express();
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { google } = require('googleapis');

// Load API credentials from JSON file
const apikeys = require('./apikeys.json');

const {JWT} = require('google-auth-library');
const keys = apikeys;

// Your AccountSID and Auth Token from console.twilio.com
const twAccountSid = process.env.twAccountSid;
const twAuthToken = process.env.twAuthToken;
const twFlowId = process.env.twFlowId;
const twOutgoingPhone = process.env.twOutgoingPhone;
const recordingFolder = process.env.recordingFolder;

const myDbHost = process.env.myDbHost;
const myDbUser = process.env.myDbUser;
const myDbPass = process.env.myDbPass;
const myDbName = process.env.myDbName;

//https://drive.google.com/drive/folders/1Y2672RR3o1N7aBkrZmSXbyhcvglRHKm5?usp=sharing
GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID;

var con = mysql.createConnection({
  host: myDbHost,
  user: myDbUser,
  password: myDbPass
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to MySQL!");
  con.query(`CREATE DATABASE IF NOT EXISTS ${myDbName}`, function (err, result) {
    if (err) throw err;
    console.log("Database created");
  });
});

const db = mysql.createPool({
    host: myDbHost,
    user: myDbUser,
    password: myDbPass,
    database: myDbName,
});

db.getConnection(function(err) {
  if (err) throw err;
  console.log("Connected to DB!");
  var sql = "CREATE TABLE IF NOT EXISTS customers (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, phone VARCHAR(20) NOT NULL, plan VARCHAR(25), cost FLOAT, PRIMARY KEY (id))";

  db.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Customer Table created");
  });

  var sql1 = "CREATE TABLE IF NOT EXISTS calls (id INT NOT NULL AUTO_INCREMENT, customerId INT NOT NULL, twilioFlowSid VARCHAR(255), twilioCallSid VARCHAR(255), twilioRecordingSid VARCHAR(255), twilioRecordingUrl VARCHAR(255), startTime DATETIME, duration INT, PRIMARY KEY (id), FOREIGN KEY (customerId) REFERENCES customers(id))";

  db.query(sql1, function (err, result) {
    if (err) throw err;
    console.log("Calls Table created");
  });

});

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cors());

// Google drive functions
// Define the scope for Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Function to authorize and get access to Google Drive API
/*async function authorize() {
    const auth = new google.auth.JWT(
        apikeys.client_email,
        null,
        apikeys.private_key,
        SCOPES
    );

    try {
        auth.authorize();
        return auth;
    } catch (error) {
        throw new Error(`Error authorizing Google Drive API: ${error.message}`);
    }
}

authClient = authorize();
*/

const authClient = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'apikeys.json'),
  scopes: SCOPES,
});

console.log(`authclient:${authClient}`);

// Function to upload a file to Google Drive
async function uploadFile(auth, filePath, folderId) {
    console.log(`uploadFile filePath: ${filePath}`);
    console.log(`uploadFile folderId: ${folderId}`);

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
        name: filePath.split('/').pop(), // Extract file name from path
        parents: [folderId] // Folder ID to upload the file into
    };

    const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath) // Readable stream for file upload
    };

    try {
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });

        console.log('File uploaded successfully. File ID:', response.data.id);
        return response.data.id;
    } catch (error) {
	throw(error);
        console.log(`Error uploading file to Google Drive: ${error.message}`);
    }
}

/**
 * Search file in drive location
 * @return{obj} data file
 * */
async function downloadFile(auth,recordingSid) {

if (!fs.existsSync(`${recordingFolder}/${recordingSid}.mp3`)) {

  const service = google.drive({version: 'v3', auth});
  const files = [];
  try {
    const res = await service.files.list({
      q: `name=${recordingSid}.mp3`,
      fields: 'nextPageToken, files(id, name)',
      spaces: 'drive',
    });

    Array.prototype.push.apply(files, res.files);

    res.data.files.forEach(function(file) {
      console.log('Found file:', file.name, file.id);

      var file = fs.createWriteStream(`${recordingFolder}/recordings/` + item.title);
	file.on("finish", function() {
	console.log("downloaded", item.title);
	});

	// Download file
	drive.files.get({
	auth: client,
	fileId: item.id,
	alt: "media"
	}).pipe(file);
      });

    return res.data.files;
  } catch (err) {
    // TODO(developer) - Handle error
    console.log(`File ${recordingSid} not found`);
  }
} else {
   console.log(`${recordingSid}.mp3 already exists. Skipping download`);
}
}



// Function to delete a file from Google Drive
async function deleteFile(auth, fileId) {
    const drive = google.drive({ version: 'v3', auth });

    try {
          drive.files.delete({
            fileId: fileId
        });

        console.log('File deleted successfully.');
    } catch (error) {
        console.log(`Error deleting file from Google Drive: ${error.message}`);
    }
}

// Function to update a file in Google Drive
async function updateFile(auth, fileId, filePath) {
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
        name: filePath.split('/').pop() // Extract file name from path
    };

    const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath) // Readable stream for file update
    };

    try {
        const response = drive.files.update({
            fileId: fileId,
            resource: fileMetadata,
            media: media
        });

        console.log('File updated successfully.');
    } catch (error) {
        console.log(`Error updating file in Google Drive: ${error.message}`);
    }

}

server.post("/register", (req, res) => {
    const { name } = req.body;
    const { phone } = req.body;
    const { plan } = req.body;
    const { cost } = req.body

    let sql = "INSERT INTO customers (name, phone, plan, cost) VALUES (?,?,?,?)"
    db.query(sql, [name, phone, plan, cost], (err,result) =>{
        if (err) {
            console.log(err);
        }else{
            console.log(result);
        }
    })
});

server.get("/customers", (req, res) => {
console.log("fetching /customers");

    let sql = "SELECT * FROM customers";
    db.query(sql, (err,result) =>{
        if (err) {
            console.log(err);
        }else{
            res.send(result);
        }

    })
});

server.get("/calls/:customerId", (req, res) => {
    const { customerId } = req.params

    let sql = "SELECT * FROM calls where customerId = ?";
    db.query(sql, [customerId], (err,result) =>{
        if (err) {
            console.log(err);
        }else{
	    console.log(result);
            res.send(result);
        }
    })
});

server.put("/edit", (req, res) => {
    const { id } = req.body;
    const { name } = req.body;
    const { phone } = req.body;
    const { plan } = req.body;
    const { cost } = req.body;

    let sql = "UPDATE customers SET name = ?, phone = ?, plan = ?, cost = ? WHERE id = ?";
    db.query(sql, [name, phone, plan, cost, id], (err,result) =>{
        if (err) {
            console.log(err);
        }else{

            res.send(result);
        }
    })
});

server.delete("/delete/:index", (req,res) =>{
    const { index } = req.params

    let sql = "DELETE FROM calls WHERE customerId = ?"
    db.query(sql, [index], (err,result) =>{err ? console.log('') : console.log('')})

    let sql1 = "DELETE FROM customers WHERE id = ?"
    db.query(sql1, [index], (err,result) =>{err ? console.log('') : res.send(result)})
})

server.get("/call/:index", (req,res) =>{
    const { index } = req.params

    const client = require('twilio')(twAccountSid, twAuthToken);

    let sql = "SELECT * FROM customers WHERE id = ?"

    db.query(sql, [index], (err,result) =>{
        if (err) {
            console.log(err);
        }else{
	    console.log(result);

	    client.studio.v2.flows(twFlowId)
             .executions
             .create({
                 to: result[0].phone,
                 from: twOutgoingPhone,
                 parameters: {
                   name: result[0].name,
		   plan: result[0].plan,
		   cost: result[0].cost,
                 }})

             .then(execution => {
		     console.log(execution);

		    call_query = "INSERT INTO calls (customerId, twilioFlowSid) VALUES (?, ?);";
	    
		    db.query(call_query, [index, execution.sid], (err,result) =>{
                	if (err) {
	                  console.log(err);
        	        }else{
                	  console.log(result);
		        }
		    });
	     })
                
	    res.send(result);
	}
    });
})

async function twDownloadRecording(recordingSid){
      var success = false;

      console.log(`Starting download recording: ${recordingSid}`);

      var options = {
        host: 'api.twilio.com',
        port: 443,
        path: '/2010-04-01/Accounts/' + twAccountSid + '/Recordings/'+ recordingSid  + '.mp3',
        method: 'GET',
        auth: twAccountSid + ":" + twAuthToken,
        agent: false
      };

    var https = require('https');
    var req1 = https.request(options, function(res1) {
        res1.setEncoding('binary');

        var mp3data = '';

        var i = 1;

        res1.on('data', function (chunk) {
	   console.log(i);
	   i += 1;
           mp3data += chunk;
        });
 
        res1.on('end', function(){
          try{
              var fileName = `${recordingFolder}/${recordingSid}.mp3`;
              fs.writeFile(fileName, mp3data, 'binary', function(err){
                if(err){
                  return console.log(err);
                }else{
                  console.log(`File Saved ${fileName}`);

		  success = true;
                }
              });
          }catch(err){
              console.log(err.message);
          }
        });
      });

      req1.end();

      console.log(`End download recording: ${recordingSid}`);

    return new Promise((resolve) => { 
      setTimeout(() => { 
      resolve(success); 
    }, 10000); 
  }); 
}

server.post("/recording-events", async function(req,res) {

  try{
    const client = require('twilio')(twAccountSid, twAuthToken);

    const pData = req.body;
    const flowSid = req.query.flowsid;
    console.log(`flowsid=${flowSid}`);

    // Process the data
    console.log('Received POST data:', pData);

    console.log("Downloading Recording mp3 ${pData.RecordingSid}");

    recordingUrl = pData.RecordingUrl;
    recordingSid = pData.RecordingSid;

//    if (fs.existsSync(`${recordingFolder}/${recordingSid}.mp3`)) {
      console.log('Download completed successfully');

      let sql = `UPDATE calls SET twilioCallSid = ?, twilioRecordingSid = ?, twilioRecordingUrl = ?, startTime = STR_TO_DATE(?, '%d-%b-%Y %T'), duration = ? WHERE twilioFlowSId = ?`;

      str = pData.RecordingStartTime;
      str = str.substring(5, str.indexOf("+")).trim().replace(" ", "-").replace(" ", "-");
      pData.RecordingStartTime = str;

      db.query(sql, [pData.CallSid, pData.RecordingSid, pData.RecordingUrl, pData.RecordingStartTime, pData.RecordingDuration, flowSid], (err,result) =>{
        if (err) {
            console.log(err);
        }else{
	    console.log(result);
            res.send(result);
        }
      })

      downloadSuccess = await twDownloadRecording(recordingSid);

      console.log(`downloadSuccess=${downloadSuccess}`);

      if(downloadSuccess)
       try{
	 console.log(`Starting upload of ${recordingSid}.mp3`);
	  // Upload a file
	  const uploadedFile = await uploadFile(authClient, `${recordingFolder}/${recordingSid}.mp3`, GDRIVE_FOLDER_ID); // Replace 'GDRIVE_FOLDER_ID_HERE' with the desired folder ID
	  const fileId = uploadedFile.id;
	  console.log(`${recordingSid} uploaded to google. fileId = ${fileId}`);
        } catch (error) {
  	  //console.error(error);
        }

	//if(uploadedFile){
	      console.log("Delete recording from twilio");

	      client.recordings(recordingSid)
	        .remove()
	        .then(() => console.log('')) //(`Recording with SID ${recordingSid} deleted successfully`))
	        .catch(error => console.error('')); //(`Error deleting recording: ${error.message}`));
	//}

  } catch (error) {
    console.log(error);
  }
})

server.post("/transcription-events", (req,res) =>{
    const { recording } = req.params

    console.log(req);

    const client = require('twilio')(twAccountSid, twAuthToken);

})

/*
// Function to list available files in Google Drive
async function listFiles(auth) {
    const drive = google.drive({ version: 'v3', auth });

    try {
        const response = await drive.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name)',
        });

        const files = response.data.files;
        if (files.length) {
            console.log('Available files:');
            files.forEach(file => {
                console.log(`${file.name} (${file.id})`);
            });
        } else {
            console.log('No files found.');
        }
    } catch (error) {
        console.log(`Error listing files in Google Drive: ${error.message}`);
    }
}
*/

const { authenticate } = require('@google-cloud/local-auth');

async function listGFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  try {
    const response = await drive.files.list({
	  q: `'${GDRIVE_FOLDER_ID}' in parents and trashed=false`,
          fields: 'files(id, name, mimeType)',
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    });
    const files = response.data.files;
    if (files.length) {
      console.log('Files:');
      files.forEach((file) => {
        console.log(`${file.name} (${file.id})`);
      });
    } else {
      console.log('No files found.');
    }
  } catch (error) {
    console.error('Error listing files:', error);
  }
}

//listGFiles(authClient);

server.get("/list-google-recordings", (res)=>{
    try{
      // List available files
      console.log('Available files:');
      listGFiles(authClient);
    } catch(error) {
	console.error(error);
    }
});

server.get("/upload-google-recording/:recordingSid", (req,res)=>{
    const { recordingSid } = req.params

    recordingPath = `${recordingFolder}/${recordingSid}.mp3`;

    if(fs.existsSync(recordingPath)) {
	    try{
	      // Upload a file
	      const uploadedFile = uploadFile(authClient, recordingPath, GDRIVE_FOLDER_ID); // Replace 'GDRIVE_FOLDER_ID_HERE' with the desired folder ID
	      const fileId = uploadedFile.id;
	      console.log(`Uploaded fileId`);
		res.send (`Upload of recording ${recordingSid} successful`);
	    } catch (error) {
		console.error(error);
	    }
	} else {
		console.log("recording not found");
	}
});

server.get("/delete-google-recording/:fileID", (req, res)=>{
    const { fileID } = req.params;

    try{
	deleteFile(authClient, fileID);
    } catch (error) {
        console.error(error);
    }
});

server.get("/download-google-recording/:recordingSid", (req, res)=>{
    const { recordingSid } = req.params;

    try{
	downloadFile(authClient, recordingSid);
    } catch (error) {
        console.error(error);
    }
});

server.get("/download-twilio-recording/:recordingSid", (req, res)=>{
    const { recordingSid } = req.params;

    try{
	twD = twDownloadRecording(recordingSid);

	res.send(`Recording saved ${recordingSid}`);
    } catch (error) {
        console.error(error);
    }
});

server.listen(3001, () =>
    console.log('') //("Running in the port 3001")
);

/*const sport = process.env.PORT || 3000;

server.use(express.static('../client/dist')); //serving client side from express

server.listen(sport, () => console.log(''); //(`Server started on port ${sport}`));
//Json Middleware
server.use(express.json());
server.use(cors());
*/
