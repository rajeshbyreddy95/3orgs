#!/bin/bash

# Package the land records chaincode
echo "Packaging land records chaincode..."

# Navigate to chaincode directory
cd /Users/rajeshbyreddy/3orgs/chaincode/landrecords

# Remove old package if exists
rm -f landrecords.tar.gz

# Create new package
tar -czf landrecords.tar.gz .

echo "Chaincode packaged successfully: landrecords.tar.gz"
echo "Package location: /Users/rajeshbyreddy/3orgs/chaincode/landrecords/landrecords.tar.gz"