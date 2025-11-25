'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const org = process.argv[2];
        const username = process.argv[3];

        if (!org || !username) {
            console.error("Usage: node registerUser.js org1|org2|org3 username");
            process.exit(1);
        }

        console.log(`>>> Registering user '${username}' for ${org}`);

        const ccpPath = path.resolve(__dirname, '..', 'fabric-samples-full', 'test-network',
            'organizations', 'peerOrganizations', `${org}.example.com`,
            `connection-${org}.json`
        );
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found at ${ccpPath}`);
        }

        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // CA Info
        const caInfo = ccp.certificateAuthorities[`ca.${org}.example.com`];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false });

        // Wallet
        const walletPath = path.join(__dirname, 'wallet', org);
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const userIdentity = await wallet.get(username);
        if (userIdentity) {
            console.log(`User '${username}' already exists in wallet for ${org}`);
            return;
        }

        // Get admin identity
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            throw new Error(`Admin identity not found in wallet for ${org}. Run enrollAdmin.js first.`);
        }

        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register user
        const secret = await ca.register(
            {
                affiliation: `${org}.department1`,
                enrollmentID: username,
                role: 'client'
            },
            adminUser
        );

        // Enroll user
        const enrollment = await ca.enroll({
            enrollmentID: username,
            enrollmentSecret: secret
        });

        const identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()
            },
            mspId: `${org.charAt(0).toUpperCase() + org.slice(1)}MSP`,
            type: 'X.509'
        };

        await wallet.put(username, identity);
        console.log(`>>> Successfully registered and enrolled user '${username}' for ${org}`);

    } catch (error) {
        console.error(`Failed to register user: ${error}`);
        process.exit(1);
    }
}

main();
