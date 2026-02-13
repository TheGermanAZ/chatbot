import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import Layout from "./layout";
import ChatView from "./ChatView";
import LoginPage from "./auth/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import RllmDemo from "./RllmDemo";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <React.StrictMode>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/new" element={<ChatView />} />
            <Route path="/chat/:id" element={<ChatView />} />
            <Route path="/rllm" element={<RllmDemo />} />
          </Route>
        </Route>
      </Routes>
    </React.StrictMode>
  </BrowserRouter>,
);
