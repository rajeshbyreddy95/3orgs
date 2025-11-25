const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function test() {
    try {
        const ccpPath = path.resolve(__dirname, 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const wallet = await Wallets.newFileSystemWallet('./wallet/org1');
        const identity = await wallet.get('clerk');

        if (!identity) {
            console.log("CLERK identity NOT found in wallet!!!");
            return;
        }

        console.log("CLERK identity exists. Connecting...");

        const gateway = new Gateway();

        await gateway.connect(ccp, {
            wallet,
            identity: 'clerk',
            discovery: { enabled: true, asLocalhost: true, auth: false }
        });

        const network = await gateway.getNetwork('mychannel');

        console.log("SUCCESS: Clerk can access mychannel!");
        await gateway.disconnect();

    } catch (err) {
        console.error("FAILED:", err.message);
    }
}

test();
