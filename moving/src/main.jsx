import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import Member from './Member.jsx'
import Admin from './Admin.jsx'
import Setup from './Setup.jsx'
import './styles.css'

const pages = { '/entrar': Login, '/aluno': Member, '/admin': Admin, '/configurar': Setup }
const path = window.location.pathname.replace(/\/$/, '')
const Page = pages[path] || App

createRoot(document.getElementById('root')).render(<Page />)
