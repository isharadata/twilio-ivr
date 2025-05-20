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

export default function FormDialog(props) {
    const bUrl = `${window.location.host}`;

    var baseUrl = "";

    if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001"
    else
        baseUrl = AppContext.baseUrl;

    const [editValues, setEditValues] = useState({
        id: props.id,
        name: props.name,
	phone: props.phone,
	address: props.address,
	plan: props.plan,
        cost: props.cost,
    });


    const handleEditValues = () => {
        axios.put(`${baseUrl}/edit`, {
            id: editValues.id,
            name: editValues.name,
	    phone: editValues.phone,
	    address: editValues.address,
	    plan: editValues.plan,
            cost: editValues.cost,
        });
        handleClose();

    }

    const handleDeleteCustomer = () => {
        axios.delete(`${baseUrl}/delete/${editValues.id}`)
    }

    const handleChangeValues = (value)=>{
        setEditValues(prevValues=>({
                ...prevValues,
                [value.target.id]: value.target.value,
            })
        )
    }

    const handleClickOpen = () => {
        props.setOpen(true);
    };

    const handleClose = () => {
        props.setOpen(false);
    };

    return (
        <div>
            <Dialog open={props.open} onClose={handleClose}>
                <DialogTitle>Edit</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Title"
                        defaultValue={props.name}
                        type="text"
                        onChange={handleChangeValues}
                        fullWidth
                        variant="standard"
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="phone"
                        label="Phone"
                        defaultValue={props.phone}
                        type="text"
                        onChange={handleChangeValues}
                        fullWidth
                        variant="standard"
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="address"
                        label="Address" 
                        defaultValue={props.address}
                        type="text"
                        onChange={handleChangeValues}
                        fullWidth
                        variant="standard"
                    />

                    <TextField
                        autoFocus
                        margin="dense"
                        id="plan"
                        label="Plan"
                        defaultValue={props.plan}
                        type="text"
                        onChange={handleChangeValues}
                        fullWidth
                        variant="standard"
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="cost"
                        label="Cost"
                        defaultValue={props.cost}
                        type="text"
                        onChange={handleChangeValues}
                        fullWidth
                        variant="standard"
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleEditValues}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
