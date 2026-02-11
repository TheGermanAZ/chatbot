import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import Layout from "./layout";
import ChatView from "./ChatView";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <React.StrictMode>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ChatView />} />
          <Route path="/chat/:id" element={<ChatView />} />
        </Route>
      </Routes>
    </React.StrictMode>
  </BrowserRouter>,
);
