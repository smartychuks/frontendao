'use client'

import {
  CryptoDevDAOABI,
  CryptoDevsDaoAddress,
  CryptoDevsNFTABI,
  CryptoDevsNFTAddress,
} from "@/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Head from "next/head";
import { useEffect, useState } from "react";
import { formatEther } from "viem/utils";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { readContract, waitForTransaction, writeContract } from "wagmi/actions";
import styles from "./page.module.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function Home() {
  // check if wallet is connected and its address using WAGMI hook
  const { address, isConnected } = useAccount();

  // variable to know if mounted
  const [isMounted, setIsMounted] = useState(false);

  // variable to show loading state
  const [loading, setLoading] = useState(false);

  // Fake NFT Token ID to purchase, to be used when creating portal
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  
  // State variable to store all proposals in the DAO
  const [proposals, setProposals] = useState([]);

  // State variable to switch tabs
  const [selectedTab, setSelectedTab] = useState("");

  // Fetch the DAO's owner
  const daoOwner = useContractRead({
    abi: CryptoDevDAOABI,
    address: CryptoDevsDaoAddress,
    functionName: "owner"
  });

  // Get the DAO's balance
  const daoBalance = useBalance({
    address: CryptoDevsDaoAddress,
  });

  // Get the number of proposals in DAO
  const numOfProposalsInDAO = useContractRead({
    abi: CryptoDevDAOABI,
    address: CryptoDevsDaoAddress,
    functionName: "numProposals",
  });

  // Get of CryptoDevs NFT balance of user
  const nftBalanceOfUser = useContractRead({
    abi: CryptoDevsNFTABI,
    address: CryptoDevsNFTAddress,
    functionName: "balanceOf",
    args: [address],
  });

  // Function to createProposal transaction
  async function createProposal() {
    setLoading(true);

    try {
      const tx = await writeContract({
        address: CryptoDevsDaoAddress,
        abi, CryptoDevDAOABI,
        functionName: "createProposal",
        args: [fakeNftTokenId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to get a proposal by it's ID
  async function fetchProposalById(id) {
    try {
      const proposal = await readContract({
        address: CryptoDevsDaoAddress,
        abi: CryptoDevDAOABI,
        functionName: "proposals",
        args: [id],
      });

      const [nftTokenId, deadline, yayVotes, nayVotes, executed] = proposal;
      const parsedProposal = {
        proposalId: id,
        nftTokenId: nftTokenId.toString(),
        deadline: new Date(parseInt(deadline.toString()) * 1000),
        yayVotes: yayVotes.toString(),
        nayVotes: nayVotes.toString(),
        executed: Boolean(executed),
      };

      return parsedProposal;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  // Function to get all proposal in DAO
  async function fetchAllProposals() {
    try {
      const proposals = [];

      for (let i = 0; i < numOfProposalsInDAO.data; i++){
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }

      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  // Function to vote NAY or YAY on a proposal
  async function voteForProposal(proposalId, vote) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDaoAddress,
        abi: CryptoDevDAOABI,
        functionName: "voteOnProposal",
        args: [proposalId, vote === "YAY" ? 0 : 1],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // function to executed proposal after deadline exceeded
  async function executeProposal(proposalId) {
    setLoading(true);
    try{
      const tx = await writeContract({
        address: CryptoDevsDaoAddress,
        abi: CryptoDevDAOABI,
        functionName: "executeProposal",
        args: [proposalId],
      });

      await waitForTransaction(tx);
    }catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // function to withdraw ether from DAO contract
  async function withdrawDAOEther() {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDaoAddress,
        abi: CryptoDevDAOABI,
        functionName: "withdrawEther",
        args: [],
      });
      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // function to render page due to selected tabs
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    }else if (selectedTab === 'View Proposals'){
      return renderViewProposalsTab();
    }
    return null;
  }

  // funtcion that renders the Create proposal tab
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalanceOfUser.data === 0) {
      return (
        <div className={styles.description}>
          You do not own any Crypto Devs NFTs <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    }else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to purchase</label>
          <input placeholder="0" type="number"
             onChange={(e) => setFakeNftTokenId(e.target.value)} />
          <button className={styles.button2} onClick={createProposal}>Create</button>
        </div>
      );
    }
  }

  // function that renders 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    }else if (proposals.length === 0) {
      return (
        <div className={styles.description}>
          No proposals have been created
        </div>
      );
    }else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.card}>
              <p>Proposal ID: {p.proposalID}</p>
              <p>Fake NFT to purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className="{styles.flex}">
                  <button className={styles.button2} onClick={() => voteForProposal(p.proposalId,"YAY")}>
                    Vote YAY
                  </button>
                  <button className={styles.button2} onClick={() => voteForProposal(p.proposalId, "NAY")}>
                    Vote NAY
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2} onClick={() => executeProposal(p.proposalId)}>
                    Execute Proposal{" "}
                    {p.yayVotes > p.nayVotes ? "(YAY)" : "NAY"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  /**
   * Code that runs each time a 'selectedTab' value changes
   * used to refetch all proposals in the DAO when user switches to 
   * 'view Proposals' tab
   */
  useEffect(() => {
    if (selectedTab == "View Proposals"){
      fetchAllProposals();
    }
  }, [selectedTab]);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) return null;
  if (!isConnected) return(
    <div><ConnectButton /></div>
  );
  console.log(nftBalanceOfUser);
  return (
    <div className={inter.className}>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>Your CryptoDevs NFT Balance: {nftBalanceOfUser.data.toString()}
            <br />
            {daoBalance.data && (
              <>
                  Treasury Balance: {" "} {formatEther(daoBalance.data.value).toString()} ETH
              </>
            )}
            <br />
            Total Number of Proposals: {numOfProposalsInDAO.data.toString()}
          </div>
          <div className={styles.flex}>
            <button className={styles.button} onClick={() => selectedTab("Create Proposal")}>
              Create Proposal
            </button>
            <button className={styles.button} onClick={() => selectedTab("View Proposals")}>
              View Proposals
            </button>
          </div>
          {renderTabs()}
          {/* Display withdraw button if owner address is connected */}
          {address && address.toLowerCase() === daoOwner.data.toLowerCase() ? (
            <div>
              {loading ? (
                <button className={styles.button}>Loading...</button>
              ) : (
                <button className={styles.button} onClick={withdrawDAOEther}>
                  Withdraw DAO ETH
                </button>
              )}
            </div>
          ) : (
            ""
          )}
        </div>
        <img className={styles.image} src="https://i.imgur.com/buNhbF7.png" />
      </div>
    </div>
  );
}