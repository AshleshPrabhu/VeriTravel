-include .env

# === CONFIG ===
ANVIL_STATE_DIR=./anvil-data

# === TESTING INFO ===
HOTEL_NAME="Sunset Resort"
HOTEL_DESC="Beautiful seaside hotel with modern rooms and ocean views"
HOTEL_LOCATION="Mangalore"
ROOM_PRICE=2
ROOM_PRICE_WEI=2000000000000000000
TOTAL_PRICE_WEI=6000000000000000000
HOTEL_TAGS=["beach","resort","wifi","pool"]
HOTEL_IMAGES=["ipfs://QmImage1","ipfs://QmImage2"]
HOTEL_RATING=4
HOTEL_TOTAL_ROOMS=25
HOTEL_PHONE="+91-9876543210"
HOTEL_EMAIL="sunsetresort@example.com"
CHECK_IN=1766505600
CHECK_OUT=1766764800

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

# === Interactions (Anvil) ===

# book-hotel:
# 	cast send $(BOOKING_ESCROW)	"bookHotel(address,uint256,string)" $(HOTEL_ADDR) $(ROOM_PRICE)ether $(TOKEN_URI) --value $(ROOM_PRICE)ether --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

# check-in:
# 	cast send $(BOOKING_ESCROW)	"checkInHotel(uint256)" $(BOOKING_ID) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

# cancel-booking:
# 	cast send $(BOOKING_ESCROW)	"cancelBooking(uint256)" $(BOOKING_ID) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

# escrow-balance:
# 	cast balance $(BOOKING_ESCROW) --rpc-url $(RPC_URL) --ether

# user-balance:
# 	cast balance $(USER_ADDR) --rpc-url $(RPC_URL) --ether

# get-booking:
# 	cast call $(BOOKING_ESCROW)	"getBooking(uint256)" $(BOOKING_ID)	--rpc-url $(RPC_URL)

get-hotels:
	cast call $(HOTEL_REGISTRY) "getHotels()" --rpc-url $(RPC_URL)

register-hotel:
	cast send $(HOTEL_REGISTRY) "registerHotel(string,string,string,uint256,string[],string[],uint8,uint16,string,string)" $(HOTEL_NAME) $(HOTEL_DESC) $(HOTEL_LOCATION) $(ROOM_PRICE_WEI) $(HOTEL_TAGS) $(HOTEL_IMAGES) $(HOTEL_RATING) $(HOTEL_TOTAL_ROOMS) $(HOTEL_PHONE) $(HOTEL_EMAIL) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

confirm-stay:
	cast send $(HOTEL_REGISTRY) "ConfirmStay(uint256,address)" $(HOTEL_ID) $(USER_ADDR) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

book-hotel:
	cast send $(BOOKING_ESCROW) "bookHotel(uint256,uint256,uint256)" $(HOTEL_ID) $(CHECK_IN) $(CHECK_OUT) --value $(TOTAL_PRICE_WEI) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

check-in:
	cast send $(BOOKING_ESCROW) "checkInHotel(uint256)" $(BOOKING_ID) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

cancel-booking:
	cast send $(BOOKING_ESCROW) "cancelBooking(uint256)" $(BOOKING_ID) --private-key $(PRIVATE_KEY) --rpc-url $(RPC_URL)

get-booking:
	cast call $(BOOKING_ESCROW) "getBooking(uint256)" $(BOOKING_ID) --rpc-url $(RPC_URL)

escrow-balance:
	cast balance $(BOOKING_ESCROW) --rpc-url $(RPC_URL) --ether

user-balance:
	cast balance $(USER_ADDR) --rpc-url $(RPC_URL) --ether