#!/bin/bash

export FABRIC_CFG_PATH=/Users/rajeshbyreddy/3orgs/fabric-samples-full/config

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org2MSP

export CORE_PEER_MSPCONFIGPATH=/Users/rajeshbyreddy/3orgs/fabric-samples-full/test-network/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp

export CORE_PEER_TLS_ROOTCERT_FILE=/Users/rajeshbyreddy/3orgs/fabric-samples-full/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

export CORE_PEER_ADDRESS=localhost:9051

export ORDERER_CA=/Users/rajeshbyreddy/3orgs/fabric-samples-full/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
