/** @param {NS} ns */
// All in one pserver manager for automatically purchasing and upgrading servers
export async function main(ns) {
    // How much RAM each purchased server will have. In this case, it'll
    // the one with the most ram/price
   
    // Iterator we'll use for our loop
		let ram = 2
    let i = 0;
	ns.getPurchasedServerUpgradeCost
	ns.getPurchasedServerMaxRam		
    // Continuously try to purchase servers until we've reached the maximum
    // amount of servers
    while (i < ns.getPurchasedServerLimit()) {
				ram = bestvalueram(ns);
        // Check if we have enough money to purchase a server (don't want to spend too much)
        if ((ns.getServerMoneyAvailable("home")/100) > ns.getPurchasedServerCost(ram)) {
            // If we have enough money, then:
            //  1. Purchase the server
            //  2. Run the deployment script on our home
            //  3. Increment our iterator to indicate that we've bought a new server
            let hostname = ns.purchaseServer("pserver-" + i, ram);
						ns.tprint(`autopurchase: Bought ${hostname} (${ram}GB) for ${ns.getPurchasedServerCost(ram)}`)
            ns.run("autonuke.js", 1 ,"early-hack-template.js");
            ++i;
        }
        //Make the script wait for a second before looping again.
        //Removing this line will cause an infinite loop and crash the game.
        await ns.sleep(1000);
    }
}

export function bestvalueram(ns) {
	// What gigabyte of ram is most worth it for purchased servers
	let bestvalueram = 2
	// Check every server going up by factors of 2 until we reach the max GB server we can purchase
	for (let i = 2; (i <= get); i = i*2) {
		// if the current ram/price is smaller than the ram/price of the server we are checking...
		if ((bestvalueram/ns.getPurchasedServerCost(bestvalueram)) <= (i/ns.getPurchasedServerCost(i))) {
			// we make the current purchase candidate the one we are checking right now
			bestvalueram = i
			// since we always return only the last server we checked and found, if two servers are the same ram/price, the one with more ram will be bought
		}
	}
	return bestvalueram
}