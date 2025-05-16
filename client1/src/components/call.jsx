import React, { useState} from "react";
import "./call.css"
import FormDialog from "./dialog/dialog";
import axios from "axios";
import AppContext from '../AppContext';

const Call = (props) => {

    const recordingSrc = `/recordings/${props.recordingSid}.mp3`;

    const bUrl = `${window.location.host}`;

    var baseUrl = "";

    if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001";
    else
        baseUrl = AppContext.baseUrl;

    const [open, setOpen] = React.useState(false);

    const cardOpen = () => {
        setOpen(true)
    }
    const handleClose = () => {
        setOpen(false);
    };

	const tryRequire = (path) => {
	  try {
	   return require(`${path}`);
	  } catch (err) {
	   return null;
	  }
	};


    const handlePlayCall = (recordingSid) => {
	var mp3FilePath = `../../../recordings/${recordingSid}.mp3`;

	axios.get(`${baseUrl}/download-google-recording/${recordingSid}`);
    }

    const handleDownloadCall = (recordingSid) => {
        const mp3Url = `http://${burl}/recordings/${recordingSid}.mp3`;
/*        const link = document.createElement("a");
        link.href = mp3Url;
        link.download = `${recordingSid}.mp3`;
        document.body.appendChild(link);
        link.click();
*/
        window.location.href = `${recordingSrc}`;
    }

    const handleDeleteCall = () => {

    }

    return (
        <>
        <div className="call-card">
            <div className="info">
                {props.startTime} {props.duration} <audio controls><source src={recordingSrc} type="audio/mp3" />
          Your browser does not support the audio element.
        </audio>
            </div>
            <div className="actions">

            </div>
        </div>
        </>
    );
};

export default Call;
