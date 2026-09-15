import React from "react";
//import { useDispatch, useSelector } from "react-redux";
//import Dialog from "@material-ui/core/Dialog";
import spinner from "../../images/loading.gif";

// import {
//   UpdateView
// } from "../redux/SessionSlice";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  title: {
    fontWeight: "bold",
  },
  paper: {
    backgroundColor: "transparent",
  },
  wait: {
    // position: 'absolute',
    // display: 'block',
    // marginRight: 'auto',
    // marginTop: '50%',
    // width:  '100%',
    // height:  '100%',
  },
}));

export default function SpinnerDialog(): JSX.Element {
  //const dispatch = useDispatch();
  //const state     = useSelector((state: any) => state);
  const classes = useStyles();

  return (
    <div>
      {/* <Dialog
        PaperProps={{
          style: {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
        open={true}
      >
        <div className={classes.wait}>
          <img src={spinner} height="40px" id="spin" alt="spin" />
        </div>
      </Dialog> */}
    </div>
  );
}
