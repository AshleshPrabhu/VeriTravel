-include .env

# === CONFIG ===
ANVIL_STATE_DIR=./anvil-data
ROOM_PRICE=2

# === COMMANDS ===
build:; forge build

deploy-sepolia:
	forge script script/DeployHotelBooking.s.sol:DeployHotelBooking --rpc-url $(SEPOLIA_RPC_URL) --private-key $(SEPOLIA_PRIVATE_KEY) --broadcast --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

verify-sepolia:
	forge verify-contract --chain sepolia --watch $(ADDRESS) src/${MyContract}.sol:${MyContract} --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deploy:
	forge script script/DeployHotelBooking.s.sol:DeployHotelBooking --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY) --broadcast -vvvv

start-anvil:
	anvil --state $(ANVIL_STATE_DIR)

# === Interactions ===

book-hotel:
	cast send $(BOOKING_ESCROW)	"bookHotel(address,uint256,string)" $(HOTEL_ADDR) $(ROOM_PRICE)ether $(TOKEN_URI) --value $(ROOM_PRICE)ether --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

check-in:
	cast send $(BOOKING_ESCROW)	"checkInHotel(uint256)" $(BOOKING_ID) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

cancel-booking:
	cast send $(BOOKING_ESCROW)	"cancelBooking(uint256)" $(BOOKING_ID) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

escrow-balance:
	cast balance $(BOOKING_ESCROW) --rpc-url $(RPC_URL) --ether

user-balance:
	cast balance $(USER_ADDR) --rpc-url $(RPC_URL) --ether

get-booking:
	cast call $(BOOKING_ESCROW)	"getBooking(uint256)" $(BOOKING_ID)	--rpc-url $(RPC_URL)