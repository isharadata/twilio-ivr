const express = require('express');
const socketIO = require('socket.io');

const server = express();

const mysql = require('mysql');
//const mysql2 = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

// Google drive functions
// Define the scope for Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive'];

clientSockets = new Map();

function getClientSocketFromPhone(phone) {

	console.log(`search for phone: ${phone}`);

	for (const [key, value] of clientSockets.entries()) {
        if (value === phone)
            return key;

	return undefined;
}

function setClientSocketToPhone(socketId, phone) {

	console.log(`set socketId: ${socketId} to phone: ${phone}`);

	clientSockets.set(socketId, phone);

	console.log(clientSockets);
}

function deleteClientSocket(socketId) {
	console.log(`delete socketId: ${socketId}`);

	clientSockets.delete(socketId);
}

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
	waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const asyncQuery = (sql) => {
  return new Promise((resolve, reject) => {

    db.query(sql, function(error, results, fields) {
        if (error) {
          console.error(error.sqlMessage);
          return reject(new Error(error));
        }
        resolve(results);
    });
  });
}

db.getConnection(function(err) {
  if (err) throw err;
  console.log("Connected to DB!");
  var sql = "CREATE TABLE IF NOT EXISTS customers (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, phone VARCHAR(20) NOT NULL, address VARCHAR(255), plan VARCHAR(25), cost FLOAT, callInProgress BOOLEAN NOT NULL DEFAULT false, PRIMARY KEY (id))";

  db.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Customer Table created");
  });

  var sql1 = "CREATE TABLE IF NOT EXISTS calls (id INT NOT NULL AUTO_INCREMENT, customerId INT NOT NULL, twilioFlowSid VARCHAR(255), twilioCallSid VARCHAR(255), twilioRecordingSid VARCHAR(255), twilioRecordingUrl VARCHAR(255), startTime DATETIME, duration INT, gdriveRecordingFileId VARCHAR(50), PRIMARY KEY (id), FOREIGN KEY (customerId) REFERENCES customers(id))";

  db.query(sql1, function (err, result) {
    if (err) throw err;
    console.log("Calls Table created");
  });

});

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cors({
	cors: { 
		origin: ['https://twilio-ivr-frontend.onrender.com', 'http://localhost:3000'],
		methods: ['GET', 'POST'],
		allowedHeaders: ["Content-Type", "Access-Control-Allow-Origin"],
	}
}));

const port = process.env.PORT || 3001;

const nodeServer = server.listen(port, () =>
    console.log('') //("Running in the port 3001")
);

//server.use(express.static('../client/dist')); //serving client side from express

const io = socketIO(nodeServer, 
	{ cors: { 
		origin: ['https://twilio-ivr-frontend.onrender.com', 'http://localhost:3000'],
		methods: ['GET', 'POST'],
		allowedHeaders: ["Content-Type", "Access-Control-Allow-Origin"],
	} 
});

server.use(function(req, res, next) {
  req.io = io;
  next();
});

io.on('connection', function(socket) {
	var clientId = socket.id;

    console.log(`Client connected: ${clientId}`);

	setClientSocketToPhone(clientId, '');

    socket.on('message', (data) => {

		const customerPhone = data;

    	console.log(`Message from ${clientId}: ${data}`);
		
		setClientSocketToPhone(clientId, customerPhone);
  	});

  	socket.on('disconnect', () => {
    	delete clientSockets[clientId];

    	console.log(`Client disconnected: ${clientId}`);
  	});
});

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
      q: `name="${recordingSid}.mp3"`,
      fields: 'nextPageToken, files(id, name)',
      spaces: 'drive',
    });

    Array.prototype.push.apply(files, res.files);

    res.data.files.forEach(function(file) {
      console.log('Found file:', file.name, file.id);

      var localFile = fs.createWriteStream(`${recordingFolder}/` + file.name);

      localFile.on("finish", function() {
	console.log("downloading", file.name);
      });

      // Download file
      service.files.get(
       {
	auth: auth,
	fileId: file.id,
	alt: "media"
	},
	{responseType: "stream"},
	(err, {data}) => {
	    if (err) {
	      console.log(err);
	      return;
	    }
	    data
	      .on("end", () => console.log(`Done. Saved recording ${recordingFolder}/${recordingSid}.mp3`))
	      .on("error", (err) => {
		console.log(err);
		return process.exit();
	    })
      	    .pipe(localFile);
	});
    });

    return res.data.files;
  } catch (err) {
    // TODO(developer) - Handle error
    console.log(err);

    return `File ${recordingSid} not found`;
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
    const { address } = req.body;
    const { plan } = req.body;
    const { cost } = req.body

    let sql = "INSERT INTO customers (name, phone, address, plan, cost) VALUES (?,?,?,?,?)"
    db.query(sql, [name, phone, address, plan, cost], (err,result) =>{
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
	    //console.log(result);
            res.send(result);
        }
    })
});

server.put("/edit", (req, res) => {
    const { id } = req.body;
    const { name } = req.body;
    const { phone } = req.body;
    const { address } = req.body;
    const { plan } = req.body;
    const { cost } = req.body;

    let sql = "UPDATE customers SET name = ?, phone = ?, address = ?, plan = ?, cost = ? WHERE id = ?";
    db.query(sql, [name, phone, address, plan, cost, id], (err,result) =>{
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

server.get("/call/:index/:clientSocketId", (req,res) =>{
	console.log("calling: " + req.params);

    const { index } = parseInt(req.params.index, 10);
	const { clientSocketId } = req.params.clientSocketId;

    const client = require('twilio')(twAccountSid, twAuthToken);

    let sql = "SELECT * FROM customers WHERE id = ?"

    db.query(sql, [index], (err,result) =>{
        if (err) {
            console.log(err);
        }else{

	    console.log(`result = ${result}`);

		setClientSocketToPhone(clientSocketId, result[0].phone);

		var clientId = getClientSocketFromPhone(result[0].phone);

	    //if there's already a call in progress
	    if (result[0].callInProgress) {
			console.log(`clientId=${clientId}: A call is already in progress for ${result[0].name} - ${result[0].phone}`);

			if(clientId)
			    socket.to(clientId).emit('Call Progress', JSON.stringify({'type':'Call Progress', 'data': `A call is already in progress for ${result[0].name} - ${result[0].phone}`}));

		    return `A call is already in progress for ${result[0].name} - ${result[0].phone}`;
	    } else {
			if(clientId)
			    socket.to(clientId).emit("Call Progress", JSON.stringify({'type':'callProgress', 'data':`Initiating a call for ${result[0].name} - ${result[0].phone}`}));

			console.log(`clientId=${clientId}: "Call Progress", JSON.stringify({'type':'callProgress', 'data': Initiating a call for ${result[0].name} - ${result[0].phone}})`);
		}

	    //split cost by decimal for twilio voice to correctly articulate
	    var strCost = result[0].cost;
	    //strCost = strCost.toString().replace('.', ' ');

	    client.studio.v2.flows(twFlowId)
             .executions
             .create({
                 to: result[0].phone,
                 from: twOutgoingPhone,
                 parameters: {
                   name: result[0].name,
		   phone: result[0].phone,
		   address: result[0].address,
		   plan: result[0].plan,
		   cost: strCost,
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

		    //update customer to mark that call is in progress
            call_progress = "UPDATE customers SET callInProgress = 1 WHERE id = ?;";
     
            db.query(call_progress, [index], (err,result) =>{ 
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

    console.log(`Downloading Recording mp3 ${pData.RecordingSid}`);

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
            //res.send(result);
        }
      })

      downloadSuccess = await twDownloadRecording(recordingSid);

      console.log(`downloadSuccess=${downloadSuccess}`);

      if(downloadSuccess)
       try{

         var oldFName = '';
         var newFName = '';

		 //rename the recording
		 sql1 = `SELECT a.*, b.* FROM customers a INNER JOIN calls b ON a.id = b.customerId WHERE b.twilioFlowSId = '${flowSid}'`;

		  /*db.query(sql, [flowSid], (err,result) =>{
		    if (err) {
		      console.log(err);
		    }else{
			  console.log(result);

		      oldFName = `${recordingFolder}/${recordingSid}.mp3`;
		      newFName = `${recordingFolder}/${result[0].phone}_${result[0].startTime}.mp3`;

		    }
		   })*/

    	const result = await asyncQuery(sql1);

		oldFName = `${recordingFolder}/${recordingSid}.mp3`;
		newFName = `${recordingFolder}/${result[0].phone}_${result[0].startTime}.mp3`;

		console.log(`rename ${oldFName} to ${newFName}`);

		await new Promise((resolve) => {
			fs.access(newFName, fs.constants.F_OK, (err) => {
			if (err) {
				return fs.rename(oldFName, newFName, (err) => {
				resolve();
				});
			}
			resolve();
			});
		});

          console.log(`Starting upload of ${newFName}`);

	  // Upload a file
	  const uploadedFileId = await uploadFile(authClient, newFName, GDRIVE_FOLDER_ID)
	  sql = `UPDATE calls SET gdriveRecordingFileId = ? WHERE twilioFlowSId = ?`;
        
      	  db.query(sql, [uploadedFileId, flowSid], (err,result) =>{
            if (err) {
              console.log(err);
            }else{
              console.log(result);
            }
           })

	  const fileId = uploadedFileId;
	  console.log(`${recordingSid} uploaded to google. fileId = ${fileId}`);

	//if(uploadedFile){
	      console.log("Delete recording from twilio");

	      client.recordings(recordingSid)
	        .remove()
	        .then(() => console.log(`Recording with SID ${recordingSid} deleted successfully`))
	        .catch(error => console.error(`Error deleting recording: ${error.message}`));
	//}
        } catch (error) {
          console.error(error);
        }


  } catch (error) {
    console.log(error);
  }
})

server.post("/transcription-events", (req,res) =>{
    const { recording } = req.params

    console.log(req);

    const client = require('twilio')(twAccountSid, twAuthToken);

});

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
	res = downloadFile(authClient, recordingSid);
    } catch (error) {
        console.error(error);
	res = `${recordingSid} not found`;
    }

    return res;
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

server.post("/twilio-flow-events", (req,res) =>{
  try{
    //console.log(req.body[0]);

    const phone = req.body[0].data.contact_channel_address;

	var clientId = getClientSocketFromPhone(phone);

    if (phone && req.body[0].type == 'com.twilio.studio.flow.execution.started') {
		if (clientId)
			socket.to(clientId).emit(JSON.stringify({'type':'Call Progress', 'data': `${phone}: Call started`}));

		console.log(`clientId=${clientId} 'type':'Call Progress', 'data': ${phone}: Call started`)
    } else if (phone && req.body[0].type == 'com.twilio.studio.flow.execution.ended') {
		if (clientId) {
			socket.to(clientId).emit(JSON.stringify({'type':'Call Progress', 'data': `${phone}: Call ended`}));

	    	socketClients[clientId] = '';
		}
        
		console.log(`clientId=${clientId} {'type':'Call Progress', 'data': ${phone}: Call ended`);

		//rename the recording
		const sql = `UPDATE customers SET callInProgress = false WHERE phone = ?`;

		db.query(sql, [phone], (err,result) =>{
			if (err) {
			  console.log(err);
			}else{
			  console.log(`Set callInProgress to false for ${phone}`);
			}
		});
    } else if (phone){ //only if phone is defined
		if (clientId)
			socket.to(clientId).emit(JSON.stringify({'type':'Call Progress', 'data': `${phone}: Call in progress`}));

		console.log(`clientId=${clientId} {'type':'Call Progress', 'data': ${phone}: Call in progress`);
    } else {
        var transitioned_from = req.body[0].data.transitioned_from;
		var transitioned_to = req.body[0].data.transitioned_to;
        var name = req.body[0].data.name;
		var execution_sid = req.body[0].data.execution_sid;
		console.log({'type':'Call Progress', 'data': `${execution_sid}:: ${transitioned_from} => ${transitioned_to}: ${name}`});
	}
  } catch (err) {
    console.log(err);
  }
})
