import React, {setState, useState, useEffect} from 'react'
import './App.css'
import Axios from "axios";
import Card from "./components/card";
import Call from "./components/call";
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import AppContext from './AppContext';

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
	var options = {  
	      method: 'GET',
	      headers: {
		'ngrok-skip-browser-warning' : 1
	      }
	}

        const response = await fetch(`${baseUrl}/calls/${customerId}`, options);
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
			  gdriveFileId={call.gdriveRecordingFileId}
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
    const [refreshCustomers, setRefreshCustomers] = useState(0);
    const [customers, setCustomers] = useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleChangeValues = (value) => {
        setValues((prevValue) => ({
            ...prevValue,
            [value.target.name]: value.target.value,
        }))
    }

    const incrementRefreshCustomers = () => {
	setRefreshCustomers(refreshCustomers + 1, () => {
      		console.log('refreshCustomers updated:', refreshCustomers); // This will log the updated count
    	});
    }

    const handleClickButton = () => {
	//e.preventDefault();
        Axios.post(`${baseUrl}/register`, {
		headers: {
		        'ngrok-skip-browser-warning' : 1
      		},
            name: values.name,
	    phone: values.phone,
	    address: values.address,
	    plan: values.plan,
            cost: values.cost,
        }).then((response) =>{
            console.log(response)
        });

	console.log(refreshCustomers);
	incrementRefreshCustomers();
	incrementRefreshCustomers();
	console.log(refreshCustomers);
    }

    useEffect(() => {
	var isMounted = true;

        //const cancelToken = Axios.cancelToken.source();

        console.log(`${baseUrl}/customers`);

/*        Axios.get(`${baseUrl}/customers`, {
		headers: {
		        'ngrok-skip-browser-warning' : 1
      		}
	})
*/

        Axios.get(`${baseUrl}/customers`, {
		headers: {
		        'ngrok-skip-browser-warning' : 1
      		}
	})
            .then((response)=>{
		if(Array.isArray(response.data) && isMounted) {
	            setCustomers(response.data);
		    console.log(response);
		} else if (typeof response.data === 'object' && response.data.results) {
	           setCustomers(response.data.results); // Access array within object
        	} else {
        	  //setError('Data is not in expected format');
        	}

		setLoading(false);
            })
      	    .catch(error => {
        	setError('Error fetching data');
        	setLoading(false);
      	    });

	return () => {
	  isMounted = false;
   	 //cancelToken.cancel();
  	}
    }, [refreshCustomers])

  return (
    <div className="App">
      <div className="container">
          <h1 className="title">Customer IVR</h1>
          <h3>Add a Customer</h3>
          <div className="register-box">
              <input className="register-input" type="text" name="name" placeholder="Name" onChange={handleChangeValues} />
              <input className="register-input" type="text" name="phone" placeholder="Phone" onChange={handleChangeValues} />
              <input className="register-input" type="text" name="address" placeholder="Address" onChange={handleChangeValues} />
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
			  address={customer.address}
			  plan={customer.plan}
                          cost={customer.cost}
			  incrementRefreshCustomers={incrementRefreshCustomers}

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
