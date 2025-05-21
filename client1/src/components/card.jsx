import React, {useEffect, useState} from "react";
import "./card.css"
import FormDialog from "./dialog/dialog";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import AppContext from '../AppContext';

    function callsOpen(customerId){
      const bUrl = `${window.location.host}`;

      var baseUrl = "";

      if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001"
      else
        baseUrl = AppContext.baseUrl;

      const [values, setValues] = useState();
      const [calls, setCalls] = useState();

      useEffect(() => {
        console.log(`${baseUrl}/calls/customerId`);

        Axios.get(`${baseUrl}/calls/customerId`)
            .then((response)=>{
            setCalls(response.data);
	    console.log(response);
        })
      }
    )

  return (
    <div className="App">
      <div className="container">
          <h1 className="title">Customer IVR</h1>
          <h3>Customer Calls</h3>
          <div className="cards">
              {typeof calls !== 'undefined' &&
                  calls.map((call) => {
                      return <Card
                          key={call.id}
                          id={call.id}
                          name={call.name}
			  			  phone={call.phone}
			  			  address={call.address}
			  			  plan={call.plan}
                          cost={call.cost}

                      >
                      </Card>;
                  })}
          </div>
      </div>
    </div>
  )
 }

const Card = (props) => {

    const bUrl = `${window.location.host}`;

    var baseUrl = "";

    if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001";
    else
        baseUrl = AppContext.baseUrl;

    const [open, setOpen] = React.useState(false);
    const [openCallProgress, setOpenCallProgress] = React.useState(false);

    const cardOpen = () => {
        setOpen(true)
    }
    const handleClose = () => {
        setOpen(false);
    };

    const dlgOpenCallProgress = () => {
        setOpenCallProgress(true)
    };

    const handleCloseCallProgress = () => {
        setOpenCallProgress(false);
    };

    const handleDeleteCustomer = (customerId) => {
        axios.delete(`${baseUrl}/delete/${customerId}`, {
		headers: {
		        'ngrok-skip-browser-warning' : 1
      		}
	})
	.then((response)=>{
		props.incrementRefreshCustomers();
		props.incrementRefreshCustomers();
            })
      	    .catch(error => {
        	setError('Error fetching data');
        	setLoading(false);
      	    });
    }

    const handleCallCustomer = () => {
        axios.get(`${baseUrl}/call/${props.id}`, {
		headers: {
		        'ngrok-skip-browser-warning' : 1
      		}
	});

	
    }

    const handleCallsClick = (customerId) => {
        window.location.href = `/item/${customerId}`;
    }

    return (
        <>
        <FormDialog open={open} setOpen={setOpen} id={props.id} name={props.name} phone={props.phone} address={props.address} plan={props.plan} cost={props.cost} />
		<CallDialog open={openCallProgress} setOpen={setOpenCallProgress} id={props.id} sockid={props.sockid} />
        <div className="game-card">
            <div className="info">
                <h4>{props.name}</h4> {props.phone} {props.address} {props.plan} ${props.cost}
            </div>
            <div className="actions">
                <button className="edit" onClick={cardOpen}>Edit</button>
                <button className="delete" onClick={() => handleDeleteCustomer(props.id)}>Delete</button>
                <button className="call" onClick={() => { dlgOpenCallProgress(); handleCallCustomer();} }>Call</button>
                <button type="button" className="calllogs" onClick={() => handleCallsClick(props.id)}>Calls</button>
            </div>
        </div>
        </>
    );
};

export default Card;
