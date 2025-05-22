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
//import React, { useState } from 'react';
import { socket } from '../../socket';

function connect() {
    socket.connect();
}

function disconnect() {
    socket.disconnect();
}

socket.on("connect", () => {
  console.log(`calldialog connected: ${socketId}`);
});

socket.on("message", data => {
  let parsedResponse = JSON.parse(data);
  let parsedData = parsedResponse.data;
  let eventType = parsedResponse.type;

  console.log(`${eventType}: JSON.stringify(${parsedData})`);

  let flowParentDiv = document.querySelector('.MuiDialogContent-root');
  renderEvent(flowParentDiv, eventType, parsedData);

});

function renderEvent(flowParentDiv, eventType, parsedData) {
  const childContent = `${eventType}: ${parsedData}`;

  flowParentDiv.innerHTML = childContent;
}

export default function CallDialog(props) {
    const bUrl = `${window.location.host}`;

    var baseUrl = "";

    if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001"
    else
        baseUrl = AppContext.baseUrl;

    const handleClickOpen = () => {
        props.setOpenCallProgress(true);
    };

    const handleClose = () => {
        props.setOpenCallProgress(false);
    };

    return (
        <div>
            <Dialog open={props.openCallProgress} onClose={handleClose}>
                <DialogTitle>Call Progress</DialogTitle>
                <DialogContent>
					Call progress loading ...
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose}>OK</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
