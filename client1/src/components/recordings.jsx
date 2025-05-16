import React, { useState} from "react";
import "./card.css"
//import FormDialog from "./dialog/dialog";
import axios from "axios";

const Card = (props) => {
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

    const handleDeleteCustomer = () => {
        axios.delete(`${baseUrl}/delete/${props.id}`);
    }

    const handleCallCustomer = () => {
        axios.get(`${baseUrl}/call/${props.id}`);
    }

    return (
        <>
        <FormDialog open={open} setOpen={setOpen} id={props.id} name={props.name} phone={props.phone} plan={props.plan} cost={props.cost} />
        <div className="game-card">
            <div className="info">
                <h4>{props.name}</h4>
                <p>${props.phone}</p>
                <p>{props.plan}</p>
	        <p>{props.cost}</p>
            </div>
            <div className="actions">
                <button className="play" onClick={cardOpen}>Edit</button>
                <button className="download" onClick={handleDeleteCustomer}>Delete</button>
                <button className="delete" onClick={handleCallCustomer}>Call</button>
            </div>
        </div>
        </>
    );
};

export default Card;
