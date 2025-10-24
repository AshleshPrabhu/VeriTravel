import { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

type WalletContextType = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  account: string | null;
  connectWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  account: null,
  connectWallet: async () => {},
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");

    const ethProvider = new ethers.BrowserProvider(window.ethereum);
    await ethProvider.send("eth_requestAccounts", []);
    const ethSigner = await ethProvider.getSigner();
    const user = await ethSigner.getAddress();

    setProvider(ethProvider);
    setSigner(ethSigner);
    setAccount(user);
    console.log("Connected account:", user);
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ provider, signer, account, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
