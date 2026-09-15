import { useEffect } from "react";
import { useDispatch } from "react-redux";
import "./css/App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DVDHome from "./components/DVD/DVDHome";



/////////////////////////////////////////////////////////////////////////////////
function App() {
  const dispatch = useDispatch();
  //////////////////////////////////////////

  useEffect(() => {
    //console.log("window:", window);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return (
    <div className="App">
      <ToastContainer />
      <DVDHome />
    </div>
  );
}

export default App;
