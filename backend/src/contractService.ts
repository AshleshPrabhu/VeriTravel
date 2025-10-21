import { ethers } from 'ethers';
import { hederaService, hotelHederaService, aiAgentService } from './hedera/hederaService.js';

const HotelRegistryABI = {
    "abi": [
        {
        "type": "function",
        "name": "getHotel",
        "inputs": [{"name": "hotelId", "type": "uint256", "internalType": "uint256"}],
        "outputs": [
            {
            "name": "",
            "type": "tuple",
            "internalType": "struct HotelRegistry.Hotel",
            "components": [
                {"name": "id", "type": "uint256", "internalType": "uint256"},
                {"name": "name", "type": "string", "internalType": "string"},
                {"name": "location", "type": "string", "internalType": "string"},
                {"name": "description", "type": "string", "internalType": "string"},
                {"name": "pricePerNight", "type": "uint256", "internalType": "uint256"},
                {"name": "owner", "type": "address", "internalType": "address"},
                {"name": "isActive", "type": "bool", "internalType": "bool"}
            ]
            }
        ],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "hotels",
        "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "outputs": [
            {"name": "id", "type": "uint256", "internalType": "uint256"},
            {"name": "name", "type": "string", "internalType": "string"},
            {"name": "location", "type": "string", "internalType": "string"},
            {"name": "description", "type": "string", "internalType": "string"},
            {"name": "pricePerNight", "type": "uint256", "internalType": "uint256"},
            {"name": "owner", "type": "address", "internalType": "address"},
            {"name": "isActive", "type": "bool", "internalType": "bool"}
        ],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "registerHotel",
        "inputs": [
            {"name": "_name", "type": "string", "internalType": "string"},
            {"name": "_location", "type": "string", "internalType": "string"},
            {"name": "_description", "type": "string", "internalType": "string"},
            {"name": "_pricePerNight", "type": "uint256", "internalType": "uint256"},
            {"name": "_owner", "type": "address", "internalType": "address"}
        ],
        "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "stateMutability": "nonpayable"
        },
        {
        "type": "event",
        "name": "HotelRegistered",
        "inputs": [
            {"name": "hotelId", "type": "uint256", "indexed": true, "internalType": "uint256"},
            {"name": "name", "type": "string", "indexed": false, "internalType": "string"},
            {"name": "location", "type": "string", "indexed": false, "internalType": "string"},
            {"name": "owner", "type": "address", "indexed": true, "internalType": "address"}
        ],
        "anonymous": false
        }
    ]
};

const BookingEscrowABI = {
    "abi": [
        {
        "type": "function",
        "name": "bookings",
        "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "outputs": [
            {"name": "id", "type": "uint256", "internalType": "uint256"},
            {"name": "hotelId", "type": "uint256", "internalType": "uint256"},
            {"name": "user", "type": "address", "internalType": "address"},
            {"name": "amount", "type": "uint256", "internalType": "uint256"},
            {"name": "checkInDate", "type": "uint256", "internalType": "uint256"},
            {"name": "checkOutDate", "type": "uint256", "internalType": "uint256"},
            {"name": "guestCount", "type": "uint256", "internalType": "uint256"},
            {"name": "status", "type": "uint8", "internalType": "enum BookingEscrow.BookingStatus"},
            {"name": "escrowAccount", "type": "string", "internalType": "string"}
        ],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "confirmCheckIn",
        "inputs": [{"name": "bookingId", "type": "uint256", "internalType": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable"
        },
        {
        "type": "function",
        "name": "createBooking",
        "inputs": [
            {"name": "_hotelId", "type": "uint256", "internalType": "uint256"},
            {"name": "_user", "type": "address", "internalType": "address"},
            {"name": "_escrowAccount", "type": "string", "internalType": "string"},
            {"name": "_amount", "type": "uint256", "internalType": "uint256"},
            {"name": "_checkInDate", "type": "uint256", "internalType": "uint256"},
            {"name": "_checkOutDate", "type": "uint256", "internalType": "uint256"},
            {"name": "_guestCount", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "stateMutability": "nonpayable"
        },
        {
        "type": "function",
        "name": "getBooking",
        "inputs": [{"name": "bookingId", "type": "uint256", "internalType": "uint256"}],
        "outputs": [
            {
            "name": "",
            "type": "tuple",
            "internalType": "struct BookingEscrow.Booking",
            "components": [
                {"name": "id", "type": "uint256", "internalType": "uint256"},
                {"name": "hotelId", "type": "uint256", "internalType": "uint256"},
                {"name": "user", "type": "address", "internalType": "address"},
                {"name": "amount", "type": "uint256", "internalType": "uint256"},
                {"name": "checkInDate", "type": "uint256", "internalType": "uint256"},
                {"name": "checkOutDate", "type": "uint256", "internalType": "uint256"},
                {"name": "guestCount", "type": "uint256", "internalType": "uint256"},
                {"name": "status", "type": "uint8", "internalType": "enum BookingEscrow.BookingStatus"},
                {"name": "escrowAccount", "type": "string", "internalType": "string"}
            ]
            }
        ],
        "stateMutability": "view"
        },
        {
        "type": "event",
        "name": "BookingCreated",
        "inputs": [
            {"name": "bookingId", "type": "uint256", "indexed": true, "internalType": "uint256"},
            {"name": "hotelId", "type": "uint256", "indexed": true, "internalType": "uint256"},
            {"name": "user", "type": "address", "indexed": true, "internalType": "address"},
            {"name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256"}
        ],
        "anonymous": false
        }
    ]
};

const BookingNftABI = {
    "abi": [
        {
        "type": "function",
        "name": "mintBookingNFT",
        "inputs": [
            {"name": "to", "type": "address", "internalType": "address"},
            {"name": "bookingId", "type": "uint256", "internalType": "uint256"},
            {"name": "metadata", "type": "string", "internalType": "string"}
        ],
        "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "stateMutability": "nonpayable"
        },
        {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256", "internalType": "uint256"}],
        "outputs": [{"name": "", "type": "string", "internalType": "string"}],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"name": "owner", "type": "address", "internalType": "address"}],
        "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "ownerOf",
        "inputs": [{"name": "tokenId", "type": "uint256", "internalType": "uint256"}],
        "outputs": [{"name": "", "type": "address", "internalType": "address"}],
        "stateMutability": "view"
        }
    ]
    };

const StayProofNFTABI = {
    "abi": [
        {
        "type": "function",
        "name": "mintStayProof",
        "inputs": [
            {"name": "to", "type": "address", "internalType": "address"},
            {"name": "hotelId", "type": "uint256", "internalType": "uint256"},
            {"name": "bookingId", "type": "uint256", "internalType": "uint256"}
        ],
        "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "stateMutability": "nonpayable"
        },
        {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256", "internalType": "uint256"}],
        "outputs": [{"name": "", "type": "string", "internalType": "string"}],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"name": "owner", "type": "address", "internalType": "address"}],
        "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "ownerOf",
        "inputs": [{"name": "tokenId", "type": "uint256", "internalType": "uint256"}],
        "outputs": [{"name": "", "type": "address", "internalType": "address"}],
        "stateMutability": "view"
        }
    ]
};

export class ContractIntegrationService {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private hotelRegistry: ethers.Contract;
    private bookingEscrow: ethers.Contract;
    private bookingNft: ethers.Contract;
    private stayProofNFT: ethers.Contract;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(
            process.env.ETH_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY'
        );
        
        this.signer = new ethers.Wallet(process.env.ETH_PRIVATE_KEY!, this.provider);
        
        this.hotelRegistry = new ethers.Contract(
            process.env.HOTEL_REGISTRY_ADDRESS!,
            HotelRegistryABI.abi,
            this.signer
        );
        
        this.bookingEscrow = new ethers.Contract(
            process.env.BOOKING_ESCROW_ADDRESS!,
            BookingEscrowABI.abi,
            this.signer
        );
        
        this.bookingNft = new ethers.Contract(
            process.env.BOOKING_NFT_ADDRESS!,
            BookingNftABI.abi,
            this.signer
        );
        
        this.stayProofNFT = new ethers.Contract(
            process.env.STAY_PROOF_NFT_ADDRESS!,
            StayProofNFTABI.abi,
            this.signer
        );
    }

    async registerHotelComplete(hotelData: {
        name: string;
        location: string;
        description: string;
        pricePerNight: number;
        ownerAddress: string;
    }) {
        try {
            console.log('Starting complete hotel registration...');
            
            console.log('Registering on Ethereum...');
            const ethTx = await (this.hotelRegistry as any).registerHotel(
                hotelData.name,
                hotelData.location,
                hotelData.description,
                ethers.parseEther(hotelData.pricePerNight.toString()),
                hotelData.ownerAddress
            );
            
            const receipt = await ethTx.wait();
            const hotelRegisteredEvent = receipt.events?.find((e: any) => e.event === 'HotelRegistered');
            const hotelId = hotelRegisteredEvent?.args?.hotelId?.toNumber();
            
            console.log(`Hotel registered on Ethereum with ID: ${hotelId}`);
            
            console.log('Setting up Hedera accounts...');
            const hederaSetup = await hotelHederaService.setupHotelAccounts(hotelData.name);
            
            console.log('Complete hotel registration successful!');
            
            return {
                // Ethereum data
                ethHotelId: hotelId,
                ethTransactionHash: ethTx.hash,
                ethBlockNumber: receipt.blockNumber,
                
                // Hedera data
                hederaAccountId: hederaSetup.hotelAccount.accountId,
                hederaPrivateKey: hederaSetup.hotelAccount.privateKey,
                agentAccountId: hederaSetup.agentAccount.accountId,
                loyaltyTokenId: hederaSetup.loyaltyToken.tokenId,
                reputationTokenId: hederaSetup.reputationToken.tokenId,
                
                // Combined data for database
                hotelRecord: {
                    name: hotelData.name,
                    location: hotelData.location,
                    description: hotelData.description,
                    pricePerNight: hotelData.pricePerNight,
                    ownerAddress: hotelData.ownerAddress,
                    ethHotelId: hotelId,
                    ethTxHash: ethTx.hash,
                    hederaAccountId: hederaSetup.hotelAccount.accountId,
                    hederaPrivateKey: hederaSetup.hotelAccount.privateKey,
                    agentAccountId: hederaSetup.agentAccount.accountId,
                    loyaltyTokenId: hederaSetup.loyaltyToken.tokenId,
                    reputationTokenId: hederaSetup.reputationToken.tokenId,
                    isActive: true,
                    createdAt: new Date()
                }
            };
            
        } catch (error) {
            console.error('Complete hotel registration failed:', error);
            throw error;
        }
    }

    async createBookingComplete(bookingData: {
        hotelId: number;
        userAccountId: string;
        checkInDate: string;
        checkOutDate: string;
        guestCount: number;
        amount: number;
    }) {
        try {
            console.log('Starting complete booking flow...');
            
            console.log('Creating Hedera escrow...');
            const escrow = await aiAgentService.createBookingEscrow(
                `booking_${Date.now()}`,
                bookingData.userAccountId,
                process.env.MAIN_AI_AGENT_PRIVATE_KEY!,
                bookingData.amount
            );
            
            console.log('Creating booking on Ethereum...');
            const ethTx = await (this.bookingEscrow as any).createBooking(
                bookingData.hotelId,
                bookingData.userAccountId,
                escrow.escrowAccountId,
                ethers.parseEther(bookingData.amount.toString()),
                Math.floor(new Date(bookingData.checkInDate).getTime() / 1000),
                Math.floor(new Date(bookingData.checkOutDate).getTime() / 1000),
                bookingData.guestCount
            );
            
            const receipt = await ethTx.wait();
            const bookingCreatedEvent = receipt.events?.find((e: any) => e.event === 'BookingCreated');
            const bookingId = bookingCreatedEvent?.args?.bookingId?.toNumber();
            
            console.log('Minting booking NFT...');
            const nftTx = await (this.bookingNft as any).mintBookingNFT(
                bookingData.userAccountId,
                bookingId,
                `{"hotelId": ${bookingData.hotelId}, "bookingId": ${bookingId}, "escrow": "${escrow.escrowAccountId}"}`
            );
            await nftTx.wait();
            
            console.log('Complete booking flow successful!');
            
            return {
                bookingId,
                ethTxHash: ethTx.hash,
                escrowAccountId: escrow.escrowAccountId,
                escrowPrivateKey: escrow.escrowPrivateKey,
                hederaPaymentTx: escrow.transactionId,
                nftTxHash: nftTx.hash,
                
                // Combined data for database
                bookingRecord: {
                    ethBookingId: bookingId,
                    hotelId: bookingData.hotelId,
                    userAccountId: bookingData.userAccountId,
                    checkInDate: bookingData.checkInDate,
                    checkOutDate: bookingData.checkOutDate,
                    guestCount: bookingData.guestCount,
                    amount: bookingData.amount,
                    escrowAccountId: escrow.escrowAccountId,
                    escrowPrivateKey: escrow.escrowPrivateKey, 
                    ethTxHash: ethTx.hash,
                    hederaTxHash: escrow.transactionId,
                    status: 'confirmed',
                    createdAt: new Date()
                }
            };
            
        } catch (error) {
            console.error('Complete booking flow failed:', error);
            throw error;
        }
    }

    async processCheckIn(bookingId: number, escrowData: {
        escrowAccountId: string;
        escrowPrivateKey: string;
        hotelAccountId: string;
        amount: number;
    }) {
        try {
            console.log('Processing check-in...');
            
            console.log('Releasing payment to hotel...');
            const paymentRelease = await aiAgentService.releaseEscrowPayment(
                escrowData.escrowAccountId,
                escrowData.escrowPrivateKey,
                escrowData.hotelAccountId,
                escrowData.amount,
                bookingId.toString()
            );
            
            console.log('Updating booking status...');
            const statusTx = await (this.bookingEscrow as any).confirmCheckIn(bookingId);
            await statusTx.wait();
            
            console.log('Minting stay proof NFT...');
            // Get booking details to obtain user address and hotel ID
            const bookingDetails = await this.getBookingDetails(bookingId);
            const stayProofTx = await (this.stayProofNFT as any).mintStayProof(bookingDetails.user, bookingDetails.hotelId, bookingId);
            await stayProofTx.wait();

            console.log('Check-in processed successfully!');

            return {
                paymentReleased: true,
                hederaTxHash: paymentRelease.transactionId,
                ethTxHash: statusTx.hash,
                stayProofNftTx: stayProofTx.hash
            };
            
        } catch (error) {
            console.error('Check-in processing failed:', error);
            throw error;
        }
    }

    // Get hotel details from Ethereum
    async getHotelDetails(hotelId: number) {
        try {
            const hotel = await (this.hotelRegistry as any).getHotel(hotelId);
            return {
                id: hotel.id.toNumber(),
                name: hotel.name,
                location: hotel.location,
                description: hotel.description,
                pricePerNight: ethers.formatEther(hotel.pricePerNight),
                owner: hotel.owner,
                isActive: hotel.isActive
            };
        } catch (error) {
            console.error('Error getting hotel details:', error);
            throw error;
        }
    }

    // Get booking details from Ethereum
    async getBookingDetails(bookingId: number) {
        try {
            const booking = await (this.bookingEscrow as any).getBooking(bookingId);
            return {
                id: booking.id.toNumber(),
                hotelId: booking.hotelId.toNumber(),
                user: booking.user,
                amount: ethers.formatEther(booking.amount),
                checkInDate: new Date(booking.checkInDate.toNumber() * 1000),
                checkOutDate: new Date(booking.checkOutDate.toNumber() * 1000),
                guestCount: booking.guestCount.toNumber(),
                status: booking.status,
                escrowAccount: booking.escrowAccount
            };
        } catch (error) {
            console.error('Error getting booking details:', error);
            throw error;
        }
    }
}