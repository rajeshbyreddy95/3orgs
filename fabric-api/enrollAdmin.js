'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const org = process.argv[2]; // org1 | org2 | org3
        if (!org) {
            console.error("Usage: node enrollAdmin.js org1|org2|org3");
            process.exit(1);
        }

        console.log(`>>> Enrolling admin for ${org}`);

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

        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log(`Admin identity already exists for ${org}`);
            return;
        }

        // Enroll admin
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        const identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()
            },
            mspId: `${org.charAt(0).toUpperCase() + org.slice(1)}MSP`,
            type: 'X.509'
        };

        await wallet.put('admin', identity);
        console.log(`>>> Successfully enrolled admin for ${org}`);

    } catch (error) {
        console.error(`Failed to enroll admin: ${error}`);
        process.exit(1);
    }
}

main();
