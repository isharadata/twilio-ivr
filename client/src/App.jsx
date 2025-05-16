import React, {useState, useEffect} from 'react'
import './App.css'
import Axios from "axios";
import Card from "./components/card";
import Call from "./components/call";
import AppContext from './AppContext'
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';

function ItemDetailPage() {
    const bUrl = `${window.location.host}`;

    var baseUrl = "";

    if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001"
    else
        baseUrl = AppContext.baseUrl;

  // Extract the item ID from the URL
  const customerId = window.location.pathname.split('/')[2];

  // State to store fetched data
  const [item, setItem] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [values, setValues] = useState();
  const [calls, setCalls] = useState();

  // Fetch data when the component mounts
  React.useEffect(() => {
    let isMounted = true;
    //const cancelToken = axios.cancelToken.source();

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${baseUrl}/calls/${customerId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCalls(data);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => {
      isMounted = false;
      //cancelToken.cancel();
    }
  }, [customerId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <div className="App">
      <div className="container">
          <Link to="/">Back to Home</Link>
          <h1 className="title">Customer IVR</h1>
          <h3>Customer Calls</h3>
          <div className="calls">
              {typeof calls !== 'undefined' &&
                  calls.map((call) => {
                      return <Call
                          key={call.id}
                          id={call.id}
                          recordingSid={call.twilioRecordingSid}
			  startTime={call.startTime}
			  duration={call.duration}
                      >
                      </Call>;
                  })}
          </div>
      </div>
    </div>
  )
}

function HomePage() {
    const bUrl = `${window.location.host}`;

    var baseUrl = "";

    if(bUrl.includes("localhost"))
        baseUrl = "http://localhost:3001"
    else
        baseUrl = AppContext.baseUrl;

    const [values, setValues] = useState();
    const [customers, setCustomers] = useState();

    const handleChangeValues = (value) => {
        setValues((prevValue) => ({
            ...prevValue,
            [value.target.name]: value.target.value,
        }))
    }

    const handleClickButton = () => {

        Axios.post(`${baseUrl}/register`, {
            name: values.name,
	    phone: values.phone,
	    plan: values.plan,
            cost: values.cost,
        }).then((response) =>{
            console.log(response)
        });
    }

    useEffect(() => {
	var isMounted = true;

        //const cancelToken = Axios.cancelToken.source();

        console.log(`${baseUrl}/customers`);

        Axios.get(`${baseUrl}/customers`)
            .then((response)=>{
		if(isMounted) {
	            setCustomers(response.data);
		    console.log(response);
		}
        })

	return () => {
	  isMounted = false;
   	 //cancelToken.cancel();
  	}
    })

    useEffect(() => {
	var isMounted = true;

        //const cancelToken = axios.cancelToken.source();

        console.log(`${baseUrl}/customers`);

        Axios.get(`${baseUrl}/customers`)
            .then((response)=>{
		if(isMounted) {
            		setCustomers(response.data);
	    		console.log(response);
		}
        })

	return () => {
	  isMounted = false;
   	  //cancelToken.cancel();
  	}
    })

  return (
    <div className="App">
      <div className="container">
          <h1 className="title">Customer IVR</h1>
          <h3>Add a Customer</h3>
          <div className="register-box">
              <input className="register-input" type="text" name="name" placeholder="Name" onChange={handleChangeValues} />
              <input className="register-input" type="text" name="phone" placeholder="Phone" onChange={handleChangeValues} />
              <input className="register-input" type="text" name="plan" placeholder="Plan" onChange={handleChangeValues} />
              <input className="register-input" type="text" name="cost" placeholder="Cost" onChange={handleChangeValues} />

              <button className="register-button" onClick={handleClickButton}>Add</button>
          </div>
          <br/>
          <div className="cards">
              {typeof customers !== 'undefined' &&
                  customers.map((customer) => {
                      return <Card
                          key={customer.id}
                          id={customer.id}
                          name={customer.name}
			  phone={customer.phone}
			  plan={customer.plan}
                          cost={customer.cost}

                      >
                      </Card>;
                  })}
          </div>
      </div>
    </div>
  )


}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App
