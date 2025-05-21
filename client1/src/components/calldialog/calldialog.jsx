import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useState} from "react";
import axios from "axios";
import AppContext from '../../AppContext';
import io from 'socket.io-client';

const socket = io("https://twilio-ivr-rll6.onrender.com");

socket.on("connect", () => {
  console.log('connected');
});

socket.on("callProgress", data => {
  let parsedResponse = JSON.parse(data);
  let parsedData = parsedResponse.data;
  let eventType = parsedResponse.type;

  console.log(`message: JSON.stringify(${parsedData}) ${eventType}`);

  let currentKey = `${parsedResponse.id}-${eventType}`;

  if (!idMap.has(currentKey)) {
    if (executionMap.has(parsedData.execution_sid)) {
      let flowParentDiv = document.querySelector('DialogContent');
      let flowChildDiv = document.createElement('div');
      flowChildDiv.setAttribute("class", `step_${parsedData.execution_sid}`);
      renderEvent(flowParentDiv, flowChildDiv, eventType, parsedData);
    }
    else {
      let flowParentDiv = document.createElement('div');
      flowParentDiv.setAttribute("id", `event_${parsedData.execution_sid}`);
      document.body.append(flowParentDiv);
      let flowChildDiv = document.createElement('div');
      flowChildDiv.setAttribute("class", `step_${parsedData.execution_sid}`);
      executionMap.set(parsedData.execution_sid, true);
      renderEvent(flowParentDiv, flowChildDiv, eventType, parsedData);
    }
    idMap.set(currentKey, true);
  }

});

function renderEvent(flowParentDiv, flowChildDiv, eventType, parsedData) {
  let eventName = parsedData.name
  if (!eventName) {
    eventName = "Flow Start/End"
  }
  const childContent = `Flow: ${parsedData.execution_sid} | Event Created Time: ${parsedData.date_created} | Event Type: ${eventType} | <b>Event Name: ${eventName}</b>`
  flowChildDiv.innerHTML = childContent;
  flowParentDiv.append(flowChildDiv);
}

export default function CallDialog(props) {
    const bUrl = `${window.location.host}`;

    var baseUrl = "";

    if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001"
    else
        baseUrl = AppContext.baseUrl;

    const handleClickOpen = () => {
        props.setOpen(true);
    };

    const handleClose = () => {
        props.setOpen(false);
    };

    return (
        <div>
            <Dialog open={props.openCallProgress} onClose={handleCloseCallProgress}>
                <DialogTitle>Call Progress</DialogTitle>
                <DialogContent>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>OK</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
