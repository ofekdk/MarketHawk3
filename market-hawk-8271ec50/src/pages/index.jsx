import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import AddProduct from "./AddProduct";

import MarketplaceContacts from "./MarketplaceContacts";

import SalesAnalytics from "./SalesAnalytics";

import Orders from "./Orders";

import ActivityLogs from "./ActivityLogs";

import OrdersToComplete from "./OrdersToComplete";

import BundleMatches from "./BundleMatches";

import BatchImageEditor from "./BatchImageEditor";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    AddProduct: AddProduct,
    
    MarketplaceContacts: MarketplaceContacts,
    
    SalesAnalytics: SalesAnalytics,
    
    Orders: Orders,
    
    ActivityLogs: ActivityLogs,
    
    OrdersToComplete: OrdersToComplete,
    
    BundleMatches: BundleMatches,
    
    BatchImageEditor: BatchImageEditor,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/AddProduct" element={<AddProduct />} />
                
                <Route path="/MarketplaceContacts" element={<MarketplaceContacts />} />
                
                <Route path="/SalesAnalytics" element={<SalesAnalytics />} />
                
                <Route path="/Orders" element={<Orders />} />
                
                <Route path="/ActivityLogs" element={<ActivityLogs />} />
                
                <Route path="/OrdersToComplete" element={<OrdersToComplete />} />
                
                <Route path="/BundleMatches" element={<BundleMatches />} />
                
                <Route path="/BatchImageEditor" element={<BatchImageEditor />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}