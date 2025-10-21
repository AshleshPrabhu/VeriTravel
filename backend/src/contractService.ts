import { ethers } from 'ethers';
import { hederaService, hotelHederaService, aiAgentService } from './hedera/hederaService.js';

const HotelRegistryABI = {
    "abi": [
        {
        "type": "function",
        "name": "getHotel",
        "inputs": [{"name": "_hotelid", "type": "uint256", "internalType": "uint256"}],
        "outputs": [
            {
            "name": "",
            "type": "tuple",
            "internalType": "struct HotelRegistry.Hotel",
            "components": [
                {"name": "id", "type": "uint256", "internalType": "uint256"},
                {"name": "name", "type": "string", "internalType": "string"},
                {"name": "owner", "type": "address", "internalType": "address"},
                {"name": "location", "type": "string", "internalType": "string"},
                {"name": "description", "type": "string", "internalType": "string"},
                {"name": "pricepernight", "type": "uint256", "internalType": "uint256"},
                {"name": "ratings", "type": "uint256", "internalType": "uint256"},
                {"name": "totalbookings", "type": "uint256", "internalType": "uint256"},
                {"name": "totalRatingValue", "type": "uint256", "internalType": "uint256"},
                {"name": "totalRatingCount", "type": "uint256", "internalType": "uint256"},
                {"name": "images", "type": "string[]", "internalType": "string[]"},
                {"name": "tags", "type": "string[]", "internalType": "string[]"},
                {"name": "stars", "type": "uint8", "internalType": "uint8"},
                {"name": "totalRooms", "type": "uint16", "internalType": "uint16"},
                {"name": "phone", "type": "string", "internalType": "string"},
                {"name": "email", "type": "string", "internalType": "string"}
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
            {"name": "owner", "type": "address", "internalType": "address"},
            {"name": "location", "type": "string", "internalType": "string"},
            {"name": "description", "type": "string", "internalType": "string"},
            {"name": "pricepernight", "type": "uint256", "internalType": "uint256"},
            {"name": "ratings", "type": "uint256", "internalType": "uint256"},
            {"name": "totalbookings", "type": "uint256", "internalType": "uint256"},
            {"name": "totalRatingValue", "type": "uint256", "internalType": "uint256"},
            {"name": "totalRatingCount", "type": "uint256", "internalType": "uint256"},
            {"name": "images", "type": "string[]", "internalType": "string[]"},
            {"name": "tags", "type": "string[]", "internalType": "string[]"},
            {"name": "stars", "type": "uint8", "internalType": "uint8"},
            {"name": "totalRooms", "type": "uint16", "internalType": "uint16"},
            {"name": "phone", "type": "string", "internalType": "string"},
            {"name": "email", "type": "string", "internalType": "string"}
        ],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "registerHotel",
        "inputs": [
            {"name": "_name", "type": "string", "internalType": "string"},
            {"name": "_description", "type": "string", "internalType": "string"},
            {"name": "_location", "type": "string", "internalType": "string"},
            {"name": "_pricepernight", "type": "uint256", "internalType": "uint256"},
            {"name": "_tags", "type": "string[]", "internalType": "string[]"},
            {"name": "_images", "type": "string[]", "internalType": "string[]"},
            {"name": "_stars", "type": "uint8", "internalType": "uint8"},
            {"name": "_totalRooms", "type": "uint16", "internalType": "uint16"},
            {"name": "_phone", "type": "string", "internalType": "string"},
            {"name": "_email", "type": "string", "internalType": "string"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
        },
        {
        "type": "function",
        "name": "getHotels",
        "inputs": [],
        "outputs": [
            {
            "name": "",
            "type": "tuple[]",
            "internalType": "struct HotelRegistry.Hotel[]",
            "components": [
                {"name": "id", "type": "uint256", "internalType": "uint256"},
                {"name": "name", "type": "string", "internalType": "string"},
                {"name": "owner", "type": "address", "internalType": "address"},
                {"name": "location", "type": "string", "internalType": "string"},
                {"name": "description", "type": "string", "internalType": "string"},
                {"name": "pricepernight", "type": "uint256", "internalType": "uint256"},
                {"name": "ratings", "type": "uint256", "internalType": "uint256"},
                {"name": "totalbookings", "type": "uint256", "internalType": "uint256"},
                {"name": "totalRatingValue", "type": "uint256", "internalType": "uint256"},
                {"name": "totalRatingCount", "type": "uint256", "internalType": "uint256"},
                {"name": "images", "type": "string[]", "internalType": "string[]"},
                {"name": "tags", "type": "string[]", "internalType": "string[]"},
                {"name": "stars", "type": "uint8", "internalType": "uint8"},
                {"name": "totalRooms", "type": "uint16", "internalType": "uint16"},
                {"name": "phone", "type": "string", "internalType": "string"},
                {"name": "email", "type": "string", "internalType": "string"}
            ]
            }
        ],
        "stateMutability": "view"
        },
        {
        "type": "function",
        "name": "ConfirmStay",
        "inputs": [
            {"name": "_hotelid", "type": "uint256", "internalType": "uint256"},
            {"name": "_user", "type": "address", "internalType": "address"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
        },
        {
        "type": "event",
        "name": "HotelRegistered",
        "inputs": [
            {"name": "hotelId", "type": "uint256", "indexed": true, "internalType": "uint256"},
            {"name": "owner", "type": "address", "indexed": true, "internalType": "address"},
            {"name": "name", "type": "string", "indexed": false, "internalType": "string"},
            {"name": "location", "type": "string", "indexed": false, "internalType": "string"},
            {"name": "pricePerNight", "type": "uint256", "indexed": false, "internalType": "uint256"},
            {"name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256"},
            {"name": "stars", "type": "uint8", "indexed": false, "internalType": "uint8"},
            {"name": "tags", "type": "string[]", "indexed": false, "internalType": "string[]"}
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
        description: string;
        location: string;
        pricePerNight: number;
        tags: string[];
        images: string[];
        stars: number; 
        totalRooms: number;
        phone: string;
        email: string;
        ownerAddress?: string;
    }) {
        try {
            console.log('Starting complete hotel registration...');
            
            if (hotelData.stars < 1 || hotelData.stars > 5) {
                throw new Error('Stars must be between 1 and 5');
            }
            
            console.log('Registering on Ethereum...');
            const ethTx = await (this.hotelRegistry as any).registerHotel(
                hotelData.name,
                hotelData.description,
                hotelData.location,
                ethers.parseEther(hotelData.pricePerNight.toString()),
                hotelData.tags,
                hotelData.images,
                hotelData.stars,
                hotelData.totalRooms,
                hotelData.phone,
                hotelData.email
            );
            
            const receipt = await ethTx.wait();
            
            let hotelId;
            for (const log of receipt.logs) {
                try {
                    const parsedLog = this.hotelRegistry.interface.parseLog(log);
                    if (parsedLog?.name === 'HotelRegistered') {
                        hotelId = parsedLog.args.hotelId.toString();
                        break;
                    }
                } catch (e) {
                }
            }
            
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
                    description: hotelData.description,
                    location: hotelData.location,
                    pricePerNight: hotelData.pricePerNight,
                    tags: hotelData.tags,
                    images: hotelData.images,
                    stars: hotelData.stars,
                    totalRooms: hotelData.totalRooms,
                    phone: hotelData.phone,
                    email: hotelData.email,
                    ownerAddress: hotelData.ownerAddress || await this.signer.getAddress(),
                    ethHotelId: hotelId,
                    ethTxHash: ethTx.hash,
                    hederaAccountId: hederaSetup.hotelAccount.accountId,
                    hederaPrivateKey: hederaSetup.hotelAccount.privateKey,
                    agentAccountId: hederaSetup.agentAccount.accountId,
                    loyaltyTokenId: hederaSetup.loyaltyToken.tokenId,
                    reputationTokenId: hederaSetup.reputationToken.tokenId,
                    ratings: 0,
                    totalBookings: 0,
                    totalRatingValue: 0,
                    totalRatingCount: 0,
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
                id: hotel.id.toString(),
                name: hotel.name,
                owner: hotel.owner,
                location: hotel.location,
                description: hotel.description,
                pricePerNight: ethers.formatEther(hotel.pricepernight),
                ratings: hotel.ratings.toString(),
                totalBookings: hotel.totalbookings.toString(),
                totalRatingValue: hotel.totalRatingValue.toString(),
                totalRatingCount: hotel.totalRatingCount.toString(),
                images: hotel.images,
                tags: hotel.tags,
                stars: hotel.stars,
                totalRooms: hotel.totalRooms,
                phone: hotel.phone,
                email: hotel.email
            };
        } catch (error) {
            console.error('Error getting hotel details:', error);
            throw error;
        }
    }

    async getAllHotels() {
        try {
            const hotels = await (this.hotelRegistry as any).getHotels();
            return hotels.map((hotel: any) => ({
                id: hotel.id.toString(),
                name: hotel.name,
                owner: hotel.owner,
                location: hotel.location,
                description: hotel.description,
                pricePerNight: ethers.formatEther(hotel.pricepernight),
                ratings: hotel.ratings.toString(),
                totalBookings: hotel.totalbookings.toString(),
                totalRatingValue: hotel.totalRatingValue.toString(),
                totalRatingCount: hotel.totalRatingCount.toString(),
                images: hotel.images,
                tags: hotel.tags,
                stars: hotel.stars,
                totalRooms: hotel.totalRooms,
                phone: hotel.phone,
                email: hotel.email
            }));
        } catch (error) {
            console.error('Error getting all hotels:', error);
            throw error;
        }
    }

    async confirmUserStay(hotelId: number, userAddress: string) {
        try {
            const tx = await (this.hotelRegistry as any).ConfirmStay(hotelId, userAddress);
            const receipt = await tx.wait();
            
            console.log(`Stay confirmed for user ${userAddress} at hotel ${hotelId}`);
            
            return {
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                success: true
            };
        } catch (error) {
            console.error('Error confirming user stay:', error);
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