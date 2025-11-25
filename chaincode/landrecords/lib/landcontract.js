'use strict';

const { Contract } = require('fabric-contract-api');
const uuidv4 = require('uuid').v4;

class LandRecordContract extends Contract {

    /**
     * Initialize the chaincode
     */
    async Init(ctx) {
        console.info('Land Records Smart Contract initialized');
        return 'Land Records Smart Contract initialized successfully';
    }

    /**
     * Create a new land request
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - unique receipt number
     * @param {string} dataJson - JSON string containing land request data
     */
    async createLandRequest(ctx, receiptNumber, dataJson) {
        console.info(`Creating land request: ${receiptNumber}`);

        // Check if land request already exists
        const exists = await ctx.stub.getState(receiptNumber);
        if (exists && exists.length > 0) {
            throw new Error(`Land request with receipt number ${receiptNumber} already exists`);
        }

        // Parse and validate input data
        let data;
        try {
            data = JSON.parse(dataJson);
        } catch (error) {
            throw new Error(`Invalid JSON data: ${error.message}`);
        }

        // Initialize required fields
        data.receiptNumber = receiptNumber;
        data.createdAt = new Date().toISOString();
        data.status = data.status || 'created';
        data.currentlyWith = data.currentlyWith || '';
        data.history = Array.isArray(data.history) ? data.history : [];

        // Add transaction ID to history entries if missing
        for (let i = 0; i < data.history.length; i++) {
            const entry = data.history[i];
            if (!entry.txn_id && !entry.txnId) {
                entry.txn_id = "HIST-" + uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase();
            }
            if (!entry.patta_id) entry.patta_id = "";
        }

        // Store on blockchain
        await ctx.stub.putState(receiptNumber, Buffer.from(JSON.stringify(data)));

        console.info(`Land request ${receiptNumber} created successfully`);
        return `Land request ${receiptNumber} created successfully`;
    }

    /**
     * Read a land request by receipt number
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - receipt number to query
     */
    async readLandRequest(ctx, receiptNumber) {
        console.info(`Reading land request: ${receiptNumber}`);

        const buffer = await ctx.stub.getState(receiptNumber);
        if (!buffer || buffer.length === 0) {
            throw new Error(`Land request ${receiptNumber} does not exist`);
        }

        const landRequest = JSON.parse(buffer.toString());
        console.info(`Land request ${receiptNumber} retrieved successfully`);
        return JSON.stringify(landRequest);
    }

    /**
     * Update land request status
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - receipt number
     * @param {string} newStatus - new status
     * @param {string} assignedTo - assigned to user/role
     * @param {string} remarks - remarks
     * @param {string} fromUser - user performing the action
     * @param {string} timestamp - timestamp of action
     */
    async updateLandStatus(ctx, receiptNumber, newStatus, assignedTo, remarks, fromUser, timestamp) {
        console.info(`Updating land request ${receiptNumber} status to ${newStatus}`);

        const buffer = await ctx.stub.getState(receiptNumber);
        if (!buffer || buffer.length === 0) {
            throw new Error(`Land request ${receiptNumber} does not exist`);
        }

        const landRequest = JSON.parse(buffer.toString());

        // Ensure history array exists
        if (!Array.isArray(landRequest.history)) {
            landRequest.history = [];
        } else {
            // Retroactively add txn_id for any missing entries
            for (let i = 0; i < landRequest.history.length; i++) {
                const entry = landRequest.history[i];
                if (!entry.txn_id && !entry.txnId) {
                    entry.txn_id = "HIST-" + uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase();
                }
                if (!entry.patta_id) entry.patta_id = "";
            }
        }

        // Create new history entry
        const newEntry = {
            timestamp: timestamp || new Date().toISOString(),
            from_user: fromUser || landRequest.currentlyWith || "unknown",
            to_user: assignedTo || "",
            action: newStatus,
            remarks: remarks || "",
            patta_id: "",
            txn_id: "HIST-" + uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase()
        };

        // Set patta_id when approved
        if (newStatus === "approved" || newStatus === "completed") {
            newEntry.patta_id = receiptNumber;
            landRequest.patta_id = receiptNumber;
            landRequest.patta_generated_on = new Date().toISOString();
        }

        // Append to history
        landRequest.history.push(newEntry);

        // Update main fields
        landRequest.status = newStatus;
        landRequest.currentlyWith = assignedTo || "";
        landRequest.lastUpdated = timestamp || new Date().toISOString();

        // Save back to ledger
        await ctx.stub.putState(receiptNumber, Buffer.from(JSON.stringify(landRequest)));

        console.info(`Land request ${receiptNumber} updated successfully`);
        return `Land request ${receiptNumber} updated with status '${newStatus}'`;
    }

    /**
     * Get all land requests
     * @param {Context} ctx - transaction context
     */
    async getAllLandRequests(ctx) {
        console.info('Getting all land requests');

        const iterator = await ctx.stub.getStateByRange('', '');
        const results = [];

        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                try {
                    const record = JSON.parse(res.value.value.toString());
                    results.push(record);
                } catch (error) {
                    console.warn(`Skipping invalid record: ${error.message}`);
                }
            }
            if (res.done) break;
        }

        console.info(`Retrieved ${results.length} land requests`);
        return JSON.stringify(results);
    }

    /**
     * Get land requests by status
     * @param {Context} ctx - transaction context
     * @param {string} status - status to filter by
     */
    async getLandRequestsByStatus(ctx, status) {
        console.info(`Getting land requests with status: ${status}`);

        const iterator = await ctx.stub.getStateByRange('', '');
        const results = [];

        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                try {
                    const record = JSON.parse(res.value.value.toString());
                    if (record.status === status) {
                        results.push(record);
                    }
                } catch (error) {
                    console.warn(`Skipping invalid record: ${error.message}`);
                }
            }
            if (res.done) break;
        }

        console.info(`Retrieved ${results.length} land requests with status ${status}`);
        return JSON.stringify(results);
    }

    /**
     * Get land requests by assigned user
     * @param {Context} ctx - transaction context
     * @param {string} assignedTo - user to filter by
     */
    async getLandRequestsByAssignee(ctx, assignedTo) {
        console.info(`Getting land requests assigned to: ${assignedTo}`);

        const iterator = await ctx.stub.getStateByRange('', '');
        const results = [];

        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                try {
                    const record = JSON.parse(res.value.value.toString());
                    if (record.currentlyWith === assignedTo) {
                        results.push(record);
                    }
                } catch (error) {
                    console.warn(`Skipping invalid record: ${error.message}`);
                }
            }
            if (res.done) break;
        }

        console.info(`Retrieved ${results.length} land requests assigned to ${assignedTo}`);
        return JSON.stringify(results);
    }

    /**
     * Add action to history
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - receipt number
     * @param {string} actionDataJson - JSON string containing action data
     */
    async addActionToHistory(ctx, receiptNumber, actionDataJson) {
        console.info(`Adding action to history for: ${receiptNumber}`);

        const buffer = await ctx.stub.getState(receiptNumber);
        if (!buffer || buffer.length === 0) {
            throw new Error(`Land request ${receiptNumber} does not exist`);
        }

        let actionData;
        try {
            actionData = JSON.parse(actionDataJson);
        } catch (error) {
            throw new Error(`Invalid action data JSON: ${error.message}`);
        }

        const landRequest = JSON.parse(buffer.toString());

        // Ensure history array exists
        if (!Array.isArray(landRequest.history)) {
            landRequest.history = [];
        }

        // Create history entry
        const historyEntry = {
            timestamp: actionData.timestamp || new Date().toISOString(),
            from_user: actionData.fromUser || actionData.from_user || "unknown",
            to_user: actionData.toUser || actionData.to_user || "",
            action: actionData.action,
            remarks: actionData.remarks || "",
            patta_id: actionData.patta_id || "",
            txn_id: actionData.txn_id || "HIST-" + uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase()
        };

        // Append to history
        landRequest.history.push(historyEntry);

        // Update last modified
        landRequest.lastUpdated = new Date().toISOString();

        // Save back to ledger
        await ctx.stub.putState(receiptNumber, Buffer.from(JSON.stringify(landRequest)));

        console.info(`Action added to history for ${receiptNumber}`);
        return `Action added to history for land request ${receiptNumber}`;
    }

    /**
     * Store document hash on blockchain
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - receipt number
     * @param {string} documentType - type of document
     * @param {string} ipfsHash - IPFS hash of document
     * @param {string} uploadedBy - user who uploaded
     * @param {string} timestamp - upload timestamp
     */
    async storeDocumentHash(ctx, receiptNumber, documentType, ipfsHash, uploadedBy, timestamp) {
        console.info(`Storing document hash for ${receiptNumber}: ${documentType}`);

        const buffer = await ctx.stub.getState(receiptNumber);
        if (!buffer || buffer.length === 0) {
            throw new Error(`Land request ${receiptNumber} does not exist`);
        }

        const landRequest = JSON.parse(buffer.toString());

        // Initialize documents array if it doesn't exist
        if (!Array.isArray(landRequest.documents)) {
            landRequest.documents = [];
        }

        // Create document entry
        const documentEntry = {
            documentType,
            ipfsHash,
            uploadedBy,
            timestamp: timestamp || new Date().toISOString(),
            txn_id: "DOC-" + uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase()
        };

        // Add to documents
        landRequest.documents.push(documentEntry);

        // Update last modified
        landRequest.lastUpdated = new Date().toISOString();

        // Save back to ledger
        await ctx.stub.putState(receiptNumber, Buffer.from(JSON.stringify(landRequest)));

        console.info(`Document hash stored for ${receiptNumber}`);
        return `Document hash stored for land request ${receiptNumber}`;
    }

    /**
     * Verify document hash
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - receipt number
     * @param {string} documentType - type of document
     * @param {string} ipfsHash - IPFS hash to verify
     */
    async verifyDocument(ctx, receiptNumber, documentType, ipfsHash) {
        console.info(`Verifying document for ${receiptNumber}: ${documentType}`);

        const buffer = await ctx.stub.getState(receiptNumber);
        if (!buffer || buffer.length === 0) {
            throw new Error(`Land request ${receiptNumber} does not exist`);
        }

        const landRequest = JSON.parse(buffer.toString());

        if (!Array.isArray(landRequest.documents)) {
            throw new Error(`No documents found for land request ${receiptNumber}`);
        }

        // Find matching document
        const document = landRequest.documents.find(doc =>
            doc.documentType === documentType && doc.ipfsHash === ipfsHash
        );

        if (!document) {
            return JSON.stringify({
                verified: false,
                message: `Document ${documentType} with hash ${ipfsHash} not found`
            });
        }

        console.info(`Document verified for ${receiptNumber}`);
        return JSON.stringify({
            verified: true,
            document,
            message: `Document ${documentType} verified successfully`
        });
    }

    /**
     * Issue patta certificate
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - receipt number
     * @param {string} certificateDataJson - JSON string containing certificate data
     */
    async issuePattaCertificate(ctx, receiptNumber, certificateDataJson) {
        console.info(`Issuing patta certificate for: ${receiptNumber}`);

        const buffer = await ctx.stub.getState(receiptNumber);
        if (!buffer || buffer.length === 0) {
            throw new Error(`Land request ${receiptNumber} does not exist`);
        }

        let certificateData;
        try {
            certificateData = JSON.parse(certificateDataJson);
        } catch (error) {
            throw new Error(`Invalid certificate data JSON: ${error.message}`);
        }

        const landRequest = JSON.parse(buffer.toString());

        // Create patta certificate entry
        const pattaCertificate = {
            certificateNumber: certificateData.certificateNumber,
            issuedDate: certificateData.issuedDate || new Date().toISOString(),
            issuedBy: certificateData.issuedBy || "Government of Telangana",
            ownerName: certificateData.ownerName || landRequest.ownerName || landRequest.fullName,
            surveyNumber: certificateData.surveyNumber || landRequest.surveyNumber,
            area: certificateData.area || landRequest.area,
            address: certificateData.address || landRequest.address,
            qrCode: certificateData.qrCode || "",
            ipfsHash: certificateData.ipfsHash || "",
            status: "active",
            issuedAt: new Date().toISOString()
        };

        // Add patta to land request
        landRequest.pattaCertificate = pattaCertificate;
        landRequest.status = "completed";
        landRequest.patta_issued = true;
        landRequest.patta_issued_date = new Date().toISOString();

        // Add to history
        if (!Array.isArray(landRequest.history)) {
            landRequest.history = [];
        }

        landRequest.history.push({
            timestamp: new Date().toISOString(),
            from_user: certificateData.issuedBy || "system",
            to_user: "completed",
            action: "patta_issued",
            remarks: `Patta certificate ${certificateData.certificateNumber} issued`,
            patta_id: receiptNumber,
            txn_id: "PATTA-" + uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase()
        });

        // Save back to ledger
        await ctx.stub.putState(receiptNumber, Buffer.from(JSON.stringify(landRequest)));

        console.info(`Patta certificate issued for ${receiptNumber}`);
        return `Patta certificate ${certificateData.certificateNumber} issued for land request ${receiptNumber}`;
    }

    /**
     * Verify patta certificate
     * @param {Context} ctx - transaction context
     * @param {string} certificateNumber - certificate number to verify
     */
    async verifyPattaCertificate(ctx, certificateNumber) {
        console.info(`Verifying patta certificate: ${certificateNumber}`);

        // Find the land request that contains this certificate
        const iterator = await ctx.stub.getStateByRange('', '');
        let foundRequest = null;

        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                try {
                    const record = JSON.parse(res.value.value.toString());
                    if (record.pattaCertificate && record.pattaCertificate.certificateNumber === certificateNumber) {
                        foundRequest = record;
                        break;
                    }
                } catch (error) {
                    console.warn(`Skipping invalid record: ${error.message}`);
                }
            }
            if (res.done) break;
        }

        if (!foundRequest) {
            return JSON.stringify({
                verified: false,
                message: `Patta certificate ${certificateNumber} not found`
            });
        }

        console.info(`Patta certificate ${certificateNumber} verified`);
        return JSON.stringify({
            verified: true,
            certificate: foundRequest.pattaCertificate,
            landRequest: {
                receiptNumber: foundRequest.receiptNumber,
                ownerName: foundRequest.ownerName || foundRequest.fullName,
                surveyNumber: foundRequest.surveyNumber,
                status: foundRequest.status
            },
            message: `Patta certificate ${certificateNumber} verified successfully`
        });
    }

    /**
     * Get land request history
     * @param {Context} ctx - transaction context
     * @param {string} receiptNumber - receipt number
     */
    async getLandRequestHistory(ctx, receiptNumber) {
        console.info(`Getting history for land request: ${receiptNumber}`);

        const buffer = await ctx.stub.getState(receiptNumber);
        if (!buffer || buffer.length === 0) {
            throw new Error(`Land request ${receiptNumber} does not exist`);
        }

        const landRequest = JSON.parse(buffer.toString());

        const history = Array.isArray(landRequest.history) ? landRequest.history : [];

        console.info(`Retrieved ${history.length} history entries for ${receiptNumber}`);
        return JSON.stringify({
            receiptNumber,
            history,
            totalEntries: history.length
        });
    }
}

module.exports = LandRecordContract;