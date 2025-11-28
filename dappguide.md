Sui dApp Kit
The Sui dApp Kit is a set of React components, hooks, and utilities to help you build a dApp for the Sui ecosystem. Its hooks and components provide an interface for querying data from the Sui blockchain and connecting to Sui wallets.

Core Features

Some of the core features of the dApp Kit include:

Query hooks to get the information your dApp needs
Automatic wallet state management
Support for all Sui wallets
Pre-built React components
Lower level hooks for custom components
Install

To use the Sui dApp Kit in your project, run the following command in your project root:


npm i --save @onelabs/dapp-kit @onelabs/sui @tanstack/react-query
Setting up providers

To use the hooks and components in the dApp Kit, wrap your app with the providers shown in the following example. The props available on the providers are covered in more detail in their respective pages.


import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit';
import { getFullnodeUrl } from '@onelabs/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 
// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
	localnet: { url: getFullnodeUrl('localnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
});
const queryClient = new QueryClient();
 
function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider networks={networkConfig} defaultNetwork="localnet">
				<WalletProvider>
					<YourApp />
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	);
}
Using UI components to connect to a wallet

The dApp Kit provides a set of flexible UI components that you can use to connect and manage wallet accounts from your dApp. The components are built on top of Radix UI and are customizable.

To use the provided UI components, import the dApp Kit CSS stylesheet into your dApp. For more information regarding customization options, check out the respective documentation pages for the components and themes.


import '@onelabs/dapp-kit/dist/index.css';
Using hooks to make RPC calls

The dApp Kit provides a set of hooks for making RPC calls to the Sui blockchain. The hooks are thin wrappers around useQuery from @tanstack/react-query. For more comprehensive documentation on how to use these query hooks, check out the react-query documentation.


import { useSuiClientQuery } from '@onelabs/dapp-kit';
 
function MyComponent() {
	const { data, isPending, error, refetch } = useSuiClientQuery('getOwnedObjects', {
		owner: '0x123',
	});
 
	if (isPending) {
		return <div>Loading...</div>;
	}
 
	return <pre>{JSON.stringify(data, null, 2)}</pre>;
}



SuiClientProvider
The SuiClientProvider manages the active SuiClient that hooks and components use in the dApp Kit.

Usage

Place the SuiClientProvider at the root of your app and wrap all components that use the dApp Kit hooks.

SuiClientProvider accepts a list of network configurations to create SuiClient instances for the currently active network.


import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit';
import { getFullnodeUrl } from '@onelabs/sui/client';
 
// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
	localnet: { url: getFullnodeUrl('localnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
});
 
function App() {
	return (
		<SuiClientProvider networks={networkConfig} defaultNetwork="localnet">
			<YourApp />
		</SuiClientProvider>
	);
}
Props

networks: A map of networks you can use. The keys are the network names, and the values can be either a configuration object (SuiClientOptions) or a SuiClient instance.
defaultNetwork: The name of the network to use by default when using the SuiClientProvider as an uncontrolled component.
network: The name of the network to use when using the SuiClientProvider as a controlled component.
onNetworkChange: A callback when the active network changes.
createClient: A callback when a new SuiClient is created (for example, when the active network changes). It receives the network name and configuration object as arguments, returning a SuiClient instance.
Controlled component

The following example demonstrates a SuiClientProvider used as a controlled component.


import { createNetworkConfig, SuiClientProvider } from '@onelabs/dapp-kit';
import { getFullnodeUrl } from '@onelabs/sui/client';
import { useState } from 'react';
 
// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
	localnet: { url: getFullnodeUrl('localnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
});
 
function App() {
	const [activeNetwork, setActiveNetwork] = useState('localnet' as keyof typeof networks);
 
	return (
		<SuiClientProvider
			networks={networkConfig}
			network={activeNetwork}
			onNetworkChange={(network) => {
				setActiveNetwork(network);
			}}
		>
			<YourApp />
		</SuiClientProvider>
	);
}
SuiClient customization

The following example demonstrates how to create a custom SuiClient.


import { SuiClientProvider } from '@onelabs/dapp-kit';
import { getFullnodeUrl, SuiClient, SuiHTTPTransport } from '@onelabs/sui/client';
 
// Config options for the networks you want to connect to
const networks = {
	localnet: { url: getFullnodeUrl('localnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
} satisfies Record<string, SuiClientOptions>;
 
function App() {
	return (
		<SuiClientProvider
			networks={networks}
			defaultNetwork="localnet"
			createClient={(network, config) => {
				return new SuiClient({
					transport: new SuiHTTPTransport({
						url: 'https://api.safecoin.org',
						rpc: {
							headers: {
								Authorization: 'xyz',
							},
						},
					}),
				});
			}}
		>
			<YourApp />
		</SuiClientProvider>
	);
}
Using the SuiClient from the provider

To use the SuiClient from the provider, import the useSuiClient function from the @onelabs/dapp-kit module.


import { useSuiClient } from '@onelabs/dapp-kit';
 
function MyComponent() {
	const client = useSuiClient();
 
	// use the client
}
Creating a network selector

The dApp Kit doesn't provide its own network switcher, but you can use the useSuiClientContext hook to get the list of networks and set the active one:


function NetworkSelector() {
	const ctx = useSuiClientContext();
 
	return (
		<div>
			{Object.keys(ctx.networks).map((network) => (
				<button key={network} onClick={() => ctx.selectNetwork(network)}>
					{`select ${network}`}
				</button>
			))}
		</div>
	);
}
Using network specific configuration

If your dApp runs on multiple networks, the IDs for packages and other configurations might change, depending on which network you're using. You can use createNetworkConfig to create per-network configurations that your components can access.

The createNetworkConfig function returns the provided configuration, along with hooks you can use to get the variables defined in your configuration.

useNetworkConfig returns the full network configuration object
useNetworkVariables returns the full variables object from the network configuration
useNetworkVariable returns a specific variable from the network configuration

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit';
import { getFullnodeUrl } from '@onelabs/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 
// Config options for the networks you want to connect to
const { networkConfig, useNetworkVariable } = createNetworkConfig({
	localnet: {
		url: getFullnodeUrl('localnet'),
		variables: {
			myMovePackageId: '0x123',
		},
	},
	mainnet: {
		url: getFullnodeUrl('mainnet'),
		variables: {
			myMovePackageId: '0x456',
		},
	},
});
 
const queryClient = new QueryClient();
 
function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider networks={networkConfig} defaultNetwork="localnet">
				<WalletProvider>
					<YourApp />
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	);




    WalletProvider
Use WalletProvider to set up the necessary context for your React app. Use it at the root of your app, so that you can use any of the dApp Kit wallet components underneath it.


import { WalletProvider } from '@onelabs/dapp-kit';
 
function App() {
	return (
		<WalletProvider>
			<YourApp />
		</WalletProvider>
	);
}
The WalletProvider manages all wallet state for you, and makes the current wallet state available to other dApp Kit hooks and components.

Props

All props are optional.

preferredWallets - A list of wallets that are sorted to the top of the wallet list.
walletFilter - A filter function that accepts a wallet and returns a boolean. This filters the list of wallets presented to users when selecting a wallet to connect from, ensuring that only wallets that meet the dApp requirements can connect.
enableUnsafeBurner - Enables the development-only unsafe burner wallet, useful for testing.
autoConnect - Enables automatically reconnecting to the most recently used wallet account upon mounting.
stashedWallet - Enables and configures the Stashed wallet. Read more about how to use the Stashed integration.
storage - Configures how the most recently connected-to wallet account is stored. Set to null to disable persisting state entirely. Defaults to using localStorage if it is available.
storageKey - The key to use to store the most recently connected wallet account.
theme - The theme to use for styling UI components. Defaults to using the light theme.

Wallet components
ConnectButton
The ConnectButton shows the user a button to connect and disconnect a wallet. It automatically uses the connected state to show a connect or disconnect button.


import { ConnectButton } from '@onelabs/dapp-kit';
 
export function YourApp() {
	return <ConnectButton />;
}
Connect Wallet
Props

All props are optional.

connectText = "Connect Wallet" - The text that displays in the button when the user is not currently connected to a wallet.
walletFilter - A filter function that receives a wallet instance, and returns a boolean indicating whether the wallet should be displayed in the wallet list. By default, all wallets are displayed.


Wallet components
ConnectModal
The ConnectModal component opens a modal that guides the user through connecting their wallet to the dApp.

Controlled example


import { ConnectModal, useCurrentAccount } from '@onelabs/dapp-kit';
import { useState } from 'react';
 
export function YourApp() {
	const currentAccount = useCurrentAccount();
	const [open, setOpen] = useState(false);
 
	return (
		<ConnectModal
			trigger={
				<button disabled={!!currentAccount}> {currentAccount ? 'Connected' : 'Connect'}</button>
			}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		/>
	);
}
Click Connect to connect your wallet and see the previous code in action:

Connect
Uncontrolled example


import { ConnectModal, useCurrentAccount } from '@onelabs/dapp-kit';
 
export function YourApp() {
	const currentAccount = useCurrentAccount();
 
	return (
		<ConnectModal
			trigger={
				<button disabled={!!currentAccount}> {currentAccount ? 'Connected' : 'Connect'}</button>
			}
		/>
	);
}
Click Connect to connect your wallet and see the previous code in action:

Connect
Controlled props

open - The controlled open state of the dialog.
onOpenChange - Event handler called when the open state of the dialog changes.
trigger - The trigger button that opens the dialog.
walletFilter - A filter function that receives a wallet instance, and returns a boolean indicating whether the wallet should be displayed in the wallet list. By default, all wallets are displayed.
Uncontrolled props

defaultOpen - The open state of the dialog when it is initially rendered. Use when you do not need to control its open state.
trigger - The trigger button that opens the dialog.
walletFilter - A filter function that receives a wallet instance, and returns a boolean indicating whether the wallet should be displayed in the wallet list. By default, all wallets are displayed.





useSignTransaction
Use the useSignTransaction hook to prompt the user to sign a transaction with their wallet.


import { Transaction } from '@onelabs/sui/transactions';
import {
	ConnectButton,
	useCurrentAccount,
	useSignTransaction,
	useSuiClient,
} from '@onelabs/dapp-kit';
import { toBase64 } from '@onelabs/sui/utils';
import { useState } from 'react';
 
function MyComponent() {
	const { mutateAsync: signTransaction } = useSignTransaction();
	const [signature, setSignature] = useState('');
	const client = useSuiClient();
	const currentAccount = useCurrentAccount();
 
	return (
		<div style={{ padding: 20 }}>
			<ConnectButton />
			{currentAccount && (
				<>
					<div>
						<button
							onClick={async () => {
								const { bytes, signature, reportTransactionEffects } = await signTransaction({
									transaction: new Transaction(),
									chain: 'sui:devnet',
								});
 
								const executeResult = await client.executeTransactionBlock({
									transactionBlock: bytes,
									signature,
									options: {
										showRawEffects: true,
									},
								});
 
								// Always report transaction effects to the wallet after execution
								reportTransactionEffects(executeResult.rawEffects!);
 
								console.log(executeResult);
							}}
						>
							Sign empty transaction
						</button>
					</div>
					<div>Signature: {signature}</div>
				</>
			)}
		</div>
	);
}
Example

Connect Wallet
Arguments

transactionBlock: The transaction to sign.
chain: (optional) The chain identifier the transaction should be signed for. Defaults to the active network of the dApp.
Result

signature: The signature of the message, as a Base64-encoded string.
bytes: The serialized transaction bytes, as a Base64-encoded string.
reportTransactionEffects: A function to report the transaction effects to the wallet. This callback should always be invoked after executing the signed transaction. This function accepts the rawEffects returned from JSON-RPC executeTransactionBlock method, or the effects.bcs when executing with the GraphQL API.

useSignAndExecuteTransaction
Use the useSignAndExecuteTransaction hook to prompt the user to sign and execute a transaction block with their wallet.


import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { useState } from 'react';
 
function MyComponent() {
	const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const [digest, setDigest] = useState('');
	const currentAccount = useCurrentAccount();
 
	return (
		<div style={{ padding: 20 }}>
			<ConnectButton />
			{currentAccount && (
				<>
					<div>
						<button
							onClick={() => {
								signAndExecuteTransaction(
									{
										transaction: new Transaction(),
										chain: 'sui:devnet',
									},
									{
										onSuccess: (result) => {
											console.log('executed transaction', result);
											setDigest(result.digest);
										},
									},
								);
							}}
						>
							Sign and execute transaction
						</button>
					</div>
					<div>Digest: {digest}</div>
				</>
			)}
		</div>
	);
}
Example

Connect Wallet
Return additional data, or executing through GraphQL

To customize how transactions are executed, and what data is returned when executing a transaction, you can pass a custom execute function.


import {
	ConnectButton,
	useSuiClient,
	useCurrentAccount,
	useSignAndExecuteTransaction,
} from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { useState } from 'react';
 
function MyComponent() {
	const client = useSuiClient();
	const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
		execute: async ({ bytes, signature }) =>
			await client.executeTransactionBlock({
				transactionBlock: bytes,
				signature,
				options: {
					// Raw effects are required so the effects can be reported back to the wallet
					showRawEffects: true,
					// Select additional data to return
					showObjectChanges: true,
				},
			}),
	});
 
	const [digest, setDigest] = useState('');
	const currentAccount = useCurrentAccount();
 
	return (
		<div style={{ padding: 20 }}>
			<ConnectButton />
			{currentAccount && (
				<>
					<div>
						<button
							onClick={() => {
								signAndExecuteTransaction(
									{
										transaction: new Transaction(),
										chain: 'sui:devnet',
									},
									{
										onSuccess: (result) => {
											console.log('object changes', result.objectChanges);
											setDigest(result.digest);
										},
									},
								);
							}}
						>
							Sign and execute transaction
						</button>
					</div>
					<div>Digest: {digest}</div>
				</>
			)}
		</div>
	);
}
Arguments

transaction: The transaction to sign and execute.
chain: (optional) The chain identifier the transaction should be signed for. Defaults to the active network of the dApp.
execute: (optional) A custom function to execute the transaction
In addition to these options, you can also pass any options that the SuiClient.signAndExecuteTransaction method accepts.

