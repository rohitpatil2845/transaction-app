import {Route , BrowserRouter, Routes} from "react-router-dom"

import {Signup} from "./pages/Signup";
import {Signin} from "./pages/Signin";
import {Dashboard} from "./pages/Dashboard.jsx";
import {SendMoney} from "./pages/SendMoney";
import { PaymentStatus } from "./pages/PaymentStatus.jsx";

function App() {
  return (
    <>
       <BrowserRouter>
        <Routes>
        <Route path= "/" element = {<Signup/>} />
          <Route path= "/signup" element = {<Signup/>} />
          <Route path= "/signin" element = {<Signin/>} />
          <Route path= "/Dashboard" element = {<Dashboard/>} />
          <Route path= "/send" element = {<SendMoney/>} />
           <Route path="/paymentstatus" element={<PaymentStatus />} />
        </Routes>
       </BrowserRouter> 
    </>
  )
}

export default App
