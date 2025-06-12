import React, { useState } from 'react';
import { Box, CssBaseline, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Collapse } from '@mui/material';
import { NavLink } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ApprovalIcon from '@mui/icons-material/Approval';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ChecklistIcon from '@mui/icons-material/Checklist';
import WashIcon from '@mui/icons-material/Wash';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalculateIcon from '@mui/icons-material/Calculate';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SendIcon from '@mui/icons-material/Send';
import GetAppIcon from '@mui/icons-material/GetApp';
import BusinessIcon from '@mui/icons-material/Business';

const drawerWidth = 240;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Orders', icon: <ShoppingCartIcon />, path: '/orders' },
    { text: 'Looms', icon: <ApprovalIcon />, path: '/looms' },
    { text: 'Warps', icon: <ViewWeekIcon />, path: '/warps' },
    { text: 'Fabric Cuts', icon: <ContentCutIcon />, path: '/fabric-cuts' },
    { text: 'Loom-In', icon: <AllInboxIcon />, path: '/loom-in' },
    { text: 'Inspection Reports', icon: <AssessmentIcon />, path: '/inspection-reports' },
    { text: 'Finances', icon: <AccountBalanceIcon />, path: '/finances' },
];

const inspectionItems = [
    { text: '4-Point Inspection', icon: <ChecklistIcon />, path: '/inspection/4-point' },
    { text: 'Unwashed Inspection', icon: <CleaningServicesIcon />, path: '/inspection/unwashed' },
    { text: 'Washed Inspection', icon: <WashIcon />, path: '/inspection/washed' },
];

const approvalsItems = [
    { text: 'Job Work Wages', icon: <CalculateIcon />, path: '/approvals/job-work-wages' },
];

const invoiceApprovalsItems = [
    { text: 'Job Work Wages', icon: <CalculateIcon />, path: '/invoice-approvals/job-work-wages' },
];

const processingItems = [
    { text: 'Send for Processing', icon: <SendIcon />, path: '/processing/send' },
    { text: 'Receive from Processing', icon: <GetAppIcon />, path: '/processing/receive' },
    { text: 'Create new Processing Center', icon: <BusinessIcon />, path: '/processing/create-center' },
];

const Layout = ({ children, user, onLogout }) => {
    const [inspectionOpen, setInspectionOpen] = useState(false);
    const [approvalsOpen, setApprovalsOpen] = useState(false);
    const [invoiceApprovalsOpen, setInvoiceApprovalsOpen] = useState(false);
    const [processingOpen, setProcessingOpen] = useState(false);

    const handleInspectionClick = () => {
        setInspectionOpen(!inspectionOpen);
    };

    const handleApprovalsClick = () => {
        setApprovalsOpen(!approvalsOpen);
    };

    const handleInvoiceApprovalsClick = () => {
        setInvoiceApprovalsOpen(!invoiceApprovalsOpen);
    };

    const handleProcessingClick = () => {
        setProcessingOpen(!processingOpen);
    };
    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px`, backgroundColor: '#8B0000' }}
            >
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Fabric Production Tracker
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                         <Typography sx={{ mr: 2 }}>
                            Welcome, {user.username}
                        </Typography>
                        <LogoutIcon onClick={onLogout} sx={{ cursor: 'pointer' }} />
                    </Box>
                </Toolbar>
            </AppBar>
            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
                variant="permanent"
                anchor="left"
            >
                <Toolbar sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                    <img src="/ashok-textiles-logo.png" alt="Company Logo" style={{ height: 60 }} />
                </Toolbar>
                <Divider />
                <List>
                    {menuItems.map((item) => (
                        <ListItem 
                            button 
                            key={item.text} 
                            component={NavLink} 
                            to={item.path}
                            end={item.path === '/'}
                            sx={{
                                '&.active': {
                                    backgroundColor: 'rgba(139, 0, 0, 0.08)',
                                    color: '#8B0000',
                                    '& .MuiListItemIcon-root': {
                                        color: '#8B0000',
                                    },
                                },
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItem>
                    ))}
                    
                    {/* Inspection Section */}
                    <ListItem button onClick={handleInspectionClick}>
                        <ListItemIcon>
                            <AssignmentIcon />
                        </ListItemIcon>
                        <ListItemText primary="Inspection" />
                        {inspectionOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItem>
                    <Collapse in={inspectionOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {inspectionItems.map((item) => (
                                <ListItem 
                                    button 
                                    key={item.text} 
                                    component={NavLink} 
                                    to={item.path}
                                    sx={{
                                        pl: 4,
                                        '&.active': {
                                            backgroundColor: 'rgba(139, 0, 0, 0.08)',
                                            color: '#8B0000',
                                            '& .MuiListItemIcon-root': {
                                                color: '#8B0000',
                                            },
                                        },
                                    }}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>

                    {/* Approvals Section */}
                    <ListItem button onClick={handleApprovalsClick}>
                        <ListItemIcon>
                            <ApprovalIcon />
                        </ListItemIcon>
                        <ListItemText primary="Approvals" />
                        {approvalsOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItem>
                    <Collapse in={approvalsOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {approvalsItems.map((item) => (
                                <ListItem 
                                    button 
                                    key={item.text} 
                                    component={NavLink} 
                                    to={item.path}
                                    sx={{
                                        pl: 4,
                                        '&.active': {
                                            backgroundColor: 'rgba(139, 0, 0, 0.08)',
                                            color: '#8B0000',
                                            '& .MuiListItemIcon-root': {
                                                color: '#8B0000',
                                            },
                                        },
                                    }}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>

                    {/* Order Form Approvals Section */}
                    <ListItem button onClick={handleInvoiceApprovalsClick}>
                        <ListItemIcon>
                            <ReceiptIcon />
                        </ListItemIcon>
                        <ListItemText primary="Order Form Approvals" />
                        {invoiceApprovalsOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItem>
                    <Collapse in={invoiceApprovalsOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {invoiceApprovalsItems.map((item) => (
                                <ListItem 
                                    button 
                                    key={item.text} 
                                    component={NavLink} 
                                    to={item.path}
                                    sx={{
                                        pl: 4,
                                        '&.active': {
                                            backgroundColor: 'rgba(139, 0, 0, 0.08)',
                                            color: '#8B0000',
                                            '& .MuiListItemIcon-root': {
                                                color: '#8B0000',
                                            },
                                        },
                                    }}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>

                    {/* Processing Section */}
                    <ListItem button onClick={handleProcessingClick}>
                        <ListItemIcon>
                            <PrecisionManufacturingIcon />
                        </ListItemIcon>
                        <ListItemText primary="Processing" />
                        {processingOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItem>
                    <Collapse in={processingOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {processingItems.map((item) => (
                                <ListItem 
                                    button 
                                    key={item.text} 
                                    component={NavLink} 
                                    to={item.path}
                                    sx={{
                                        pl: 4,
                                        '&.active': {
                                            backgroundColor: 'rgba(139, 0, 0, 0.08)',
                                            color: '#8B0000',
                                            '& .MuiListItemIcon-root': {
                                                color: '#8B0000',
                                            },
                                        },
                                    }}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>
                </List>
            </Drawer>
            <Box
                component="main"
                sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
};

export default Layout; 