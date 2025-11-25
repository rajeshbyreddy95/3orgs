const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Role to organization mapping
const orgRoleMap = {
    // Org1
    'clerk': 'org1',
    'superintendent': 'org1',
    'project_officer': 'org1',
    'projectofficer': 'org1',

    // Org2
    'mro': 'org2',
    'surveyor': 'org2',
    'revenue_inspector': 'org2',
    'revenueinspector': 'org2',
    'vro': 'org2',

    // Org3
    'revenue_dept_officer': 'org3',
    'revenuedeptofficer': 'org3',
    'joint_collector': 'org3',
    'jointcollector': 'org3',
    'district_collector': 'org3',
    'districtcollector': 'org3',
    'ministry_welfare': 'org3',
    'ministrywelfare': 'org3'
};

// =========================
//  Get Contract Function
// =========================
async function getContract(role) {
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '');
    const org = orgRoleMap[normalizedRole];

    if (!org) {
        throw new Error(`Invalid role: ${role}`);
    }

    const ccpPath = path.resolve(
        __dirname,
        '..',
        'fabric-samples-full',
        'test-network',
        'organizations',
        'peerOrganizations',
        `${org}.example.com`,
        `connection-${org}.json`
    );

    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(__dirname, 'wallet', org);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get(normalizedRole);
    if (!identity) {
        throw new Error(`Identity '${normalizedRole}' not found in wallet for ${org}`);
    }

    const gateway = new Gateway();

    await gateway.connect(ccp, {
    wallet,
    identity: normalizedRole,   // NOT "admin", use the actual role/user
    discovery: { enabled: true, asLocalhost: true }
});


    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('landrecords');

    return { contract, gateway, org, normalizedRole };
}

// =========================
//     API ROUTES
// =========================

// Create land request
app.post('/api/landrequests/create', async (req, res) => {
    try {
        const { receiptNumber, data, role } = req.body;
        if (!receiptNumber || !data || !role) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const { contract, gateway, org, normalizedRole } = await getContract(role);

        console.log(`✔ Creating Land Request ${receiptNumber} by ${normalizedRole}`);

        const result = await contract.submitTransaction(
            'createLandRequest',
            receiptNumber,
            JSON.stringify(data)
        );

        await gateway.disconnect();

        res.json({
            success: true,
            message: result.toString(),
            role: normalizedRole,
            org
        });

    } catch (error) {
        console.error("❌ Create Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update land request
app.post('/api/landrequests/update', async (req, res) => {
    try {
        const { receiptNumber, status, assignedTo, remarks, role } = req.body;

        if (!receiptNumber || !status || !role) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const { contract, gateway, org, normalizedRole } = await getContract(role);
        console.log(`✔ Updating ${receiptNumber} status by ${normalizedRole}`);

        const result = await contract.submitTransaction(
            'updateLandStatus',
            receiptNumber,
            status,
            assignedTo || '',
            remarks || '',
            normalizedRole,
            new Date().toISOString()
        );

        await gateway.disconnect();

        res.json({
            success: true,
            message: result.toString(),
            role: normalizedRole,
            org
        });

    } catch (error) {
        console.error("❌ Update Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get all land requests
app.get('/api/landrequests', async (req, res) => {
    try {
        const { role } = req.query;

        const { contract, gateway, org, normalizedRole } = await getContract(role);

        console.log(`✔ Fetching ALL Land Requests as ${normalizedRole}`);

        const txn = contract.createTransaction('getAllLandRequests');
const result = await txn.evaluate();


        await gateway.disconnect();

        res.json({
            success: true,
            data: JSON.parse(result.toString()),
            role: normalizedRole,
            org
        });

    } catch (error) {
        console.error("❌ Query Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get land request by receipt number
app.get('/api/landrequests/:receiptNumber', async (req, res) => {
    try {
        const { receiptNumber } = req.params;
        const { role } = req.query;

        const { contract, gateway, org, normalizedRole } = await getContract(role);

        console.log(`✔ Fetching Request ${receiptNumber} as ${normalizedRole}`);

        const txn = contract.createTransaction('readLandRequest');
const result = await txn.evaluate(receiptNumber);


        await gateway.disconnect();

        res.json({
            success: true,
            data: JSON.parse(result.toString()),
            role: normalizedRole,
            org
        });

    } catch (error) {
        console.error("❌ Read Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// =========================
//      SERVER START
// =========================
const PORT = process.env.PORT || 4040;
app.listen(PORT, () => {
    console.log(`🚀 Fabric API running on port ${PORT}`);
});

module.exports = app;
