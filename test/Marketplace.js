const MYTToken = artifacts.require("MYTToken");
const Item = artifacts.require("Item");
const Marketplace = artifacts.require("Marketplace");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
require("dotenv").config({ path: "../.env" });
const { deployProxy, upgradeProxy } = require("@openzeppelin/truffle-upgrades");

contract("Marketplace", (accounts) => {
  let MYTTokenInstance, itemInstance, marketplaceInstance;
  let countItemId = 0;
  let feeHolder = accounts[5];
  let feeRate = 30000; // 0.3 %
  const contractOwner = accounts[8];

  before(async () => {
    let operator = accounts[0];
    MYTTokenInstance = await MYTToken.deployed();
    itemInstance = await deployProxy(Item, [
      process.env.ITEM_BASE_URI,
      contractOwner,
      operator,
    ]);

    marketplaceInstance = await deployProxy(Marketplace, [
      MYTTokenInstance.address,
      contractOwner,
      feeHolder,
      feeRate,
    ]);

    await itemInstance.setTransferRestrictionFlag(true, { from: operator });
    await itemInstance.setMarketplace(marketplaceInstance.address, true, {
      from: operator,
    });
  });

  describe("Create order", async () => {
    let itemId;
    beforeEach("mint item", async () => {
      const reponse = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      itemId = reponse.receipt.logs[0].args.tokenId.toNumber();

      countItemId++;
    });
    it("should success created item order", async () => {
      // Allow send token
      await itemInstance.approve(marketplaceInstance.address, itemId);

      const nftAddress = itemInstance.address;
      const assetId = itemId;
      const priceInUnit = "100000000000000000";
      const result = await marketplaceInstance.createOrder(
        nftAddress,
        assetId,
        priceInUnit,
        1,
        { from: accounts[0] }
      );
      assert.equal(result.receipt.status, true);
    });

    it("failure for not enough token", async () => {
      // Allow send token
      await itemInstance.setApprovalForAll(marketplaceInstance.address, true, {
        from: accounts[0],
      });

      const nftAddress = itemInstance.address;
      const assetId = itemId;
      const priceInUnit = "100000000000000000";
      await truffleAssert.reverts(
        marketplaceInstance.createOrder(
          nftAddress,
          assetId,
          priceInUnit,
          11,

          { from: accounts[0] }
        ),
        "Not an owner of token or balance not enough"
      );
    });

    it("failure for not approve item before created order", async () => {
      const nftAddress = itemInstance.address;
      const assetId = itemId;
      const priceInUnit = "100000000000000000";
      await truffleAssert.reverts(
        marketplaceInstance.createOrder(
          nftAddress,
          assetId,
          priceInUnit,
          1,

          { from: accounts[0] }
        ),
        "The contract is not allowed to transfer token"
      );
    });

    it("failure for not token owner created order", async () => {
      // Allow send token
      await itemInstance.approve(marketplaceInstance.address, itemId);

      const nftAddress = itemInstance.address;
      const assetId = itemId;
      const priceInUnit = "100000000000000000";
      await truffleAssert.reverts(
        marketplaceInstance.createOrder(
          nftAddress,
          assetId,
          priceInUnit,
          1,

          { from: accounts[1] }
        ),
        "Not an owner of token or balance not enough"
      );
    });

    it("failure for price equal 0", async () => {
      // Allow send token
      await itemInstance.approve(marketplaceInstance.address, itemId);

      const nftAddress = itemInstance.address;
      const assetId = itemId;
      const priceInUnit = "0";
      await truffleAssert.reverts(
        marketplaceInstance.createOrder(
          nftAddress,
          assetId,
          priceInUnit,
          1,

          { from: accounts[0] }
        ),
        "Price should be bigger than 0"
      );
    });
  });

  describe("Cancel order", async () => {
    let itemId, itemId2, nftAddress, assetId, assetId2, orderId;

    beforeEach("create order", async () => {
      // mint token
      const reponse = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      itemId = reponse.receipt.logs[0].args.tokenId.toNumber();
      countItemId++;

      const reponse2 = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      itemId2 = reponse2.receipt.logs[0].args.tokenId.toNumber();
      countItemId++;
      assetId2 = itemId2;

      // Allow send token
      await itemInstance.approve(marketplaceInstance.address, itemId);

      // create order with asset 1
      nftAddress = itemInstance.address;
      assetId = itemId;
      const priceInUnit = "100000000000000000";
      const orderResponse = await marketplaceInstance.createOrder(
        nftAddress,
        assetId,
        priceInUnit,
        1,
        { from: accounts[0] }
      );
      orderId = orderResponse.receipt.logs[0].args.id.toNumber();
    });

    it("should success cancel order", async () => {
      const result = await marketplaceInstance.cancelOrder(orderId);
      assert.equal(result.receipt.status, true);
    });

    it("should failure for access not published", async () => {
      await truffleAssert.reverts(
        marketplaceInstance.cancelOrder(99999, { from: accounts[0] }),
        "Asset not published"
      );
    });

    it("should failure for Unauthorized user", async () => {
      await truffleAssert.reverts(
        marketplaceInstance.cancelOrder(orderId, { from: accounts[1] }),
        "Unauthorized user"
      );
    });
  });

  describe("Execute order", async () => {
    let itemId,
      itemId2,
      nftAddress,
      assetId,
      assetId2,
      priceInUnit,
      orderId,
      perItemFee;
    beforeEach("create order", async () => {
      // mint token
      const reponse = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      itemId = reponse.receipt.logs[0].args.tokenId.toNumber();
      countItemId++;

      const reponse2 = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      itemId2 = reponse2.receipt.logs[0].args.tokenId.toNumber();
      countItemId++;
      assetId2 = itemId2;

      await itemInstance.approve(marketplaceInstance.address, itemId, {
        from: accounts[0],
      });
      await itemInstance.approve(marketplaceInstance.address, itemId2, {
        from: accounts[0],
      });

      // create order with asset 1
      nftAddress = itemInstance.address;
      assetId = itemId;
      priceInUnit = "100000000000000000";
      const orderResponse = await marketplaceInstance.createOrder(
        nftAddress,
        assetId,
        priceInUnit,
        1,
        { from: accounts[0] }
      );
      orderId = orderResponse.receipt.logs[0].args.id.toNumber();

      perItemFee = orderResponse.receipt.logs[0].args.perItemFee.toNumber();
    });

    it("should return valid itemPerFee when create order", async () => {
      const feeAmount = BigNumber(feeRate)
        .times(priceInUnit)
        .div(1000000)
        .toFixed(0);
      assert.equal(perItemFee, feeAmount, "itemPerFee invalid");
    });

    it("should success execute order item", async () => {
      await MYTTokenInstance.approve(marketplaceInstance.address, priceInUnit, {
        from: accounts[1],
      });

      const sellerbalance = await MYTTokenInstance.balanceOf(accounts[0]);
      const buyerbalance = await MYTTokenInstance.balanceOf(accounts[1]);
      const feeHolderBalance = await MYTTokenInstance.balanceOf(accounts[5]);

      const result = await marketplaceInstance.executeOrder(
        orderId,
        priceInUnit,
        1,
        { from: accounts[1] }
      );
      assert.equal(result.receipt.status, true);

      const sellerbalanceAfter = await MYTTokenInstance.balanceOf(accounts[0]);
      const buyerbalanceAfter = await MYTTokenInstance.balanceOf(accounts[1]);
      const feeHolderBalanceAfter = await MYTTokenInstance.balanceOf(
        accounts[5]
      );

      const feeAmount = BigNumber(feeRate)
        .times(priceInUnit)
        .div(1000000)
        .toFixed(0);
      assert(
        BigNumber(sellerbalanceAfter).isEqualTo(
          BigNumber(sellerbalance).plus(BigNumber(priceInUnit).minus(feeAmount))
        ),
        "Seller balance after invalid"
      );
      assert(
        BigNumber(buyerbalanceAfter).isEqualTo(
          BigNumber(buyerbalance).minus(priceInUnit)
        ),
        "Buyer balance invalid"
      );
      assert(
        BigNumber(feeHolderBalanceAfter).isEqualTo(
          BigNumber(feeHolderBalance).plus(feeAmount)
        ),
        "Fee holder balance balance after invalid"
      );
    });

    it("should failure for price is not correct", async () => {
      await MYTTokenInstance.approve(marketplaceInstance.address, priceInUnit, {
        from: accounts[1],
      });
      await truffleAssert.reverts(
        marketplaceInstance.executeOrder(orderId, 100000000, 1, {
          from: accounts[1],
        }),
        "The price is not correct"
      );
    });

    it("should failure for quantity higher than max quantity order", async () => {
      await itemInstance.setApprovalForAll(marketplaceInstance.address, true, {
        from: accounts[0],
      });
      await truffleAssert.reverts(
        marketplaceInstance.executeOrder(orderId, priceInUnit, 11, {
          from: accounts[1],
        }),
        "Marketplace: The quantity is not correct"
      );
    });

    it("should failure for access not published", async () => {
      await truffleAssert.reverts(
        marketplaceInstance.executeOrder(99999, priceInUnit, 1, {
          from: accounts[1],
        }),
        "Asset not published"
      );
    });

    it("should failure for Unauthorized user", async () => {
      await MYTTokenInstance.approve(marketplaceInstance.address, priceInUnit, {
        from: accounts[1],
      });

      await truffleAssert.reverts(
        marketplaceInstance.executeOrder(orderId, priceInUnit, 1, {
          from: accounts[0],
        }),
        "Unauthorized user"
      );
    });
  });

  describe("Update fee", async () => {
    it("should success setFeeRate", async () => {
      const newFeeRate = 0;
      const reponse = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      countItemId++;
      const itemId = reponse.receipt.logs[0].args.tokenId.toNumber();

      await itemInstance.approve(marketplaceInstance.address, itemId, {
        from: accounts[0],
      });

      const resFee = await marketplaceInstance.setFeeRate(newFeeRate, {
        from: contractOwner,
      });
      assert.equal(newFeeRate, resFee.logs[0].args.feeRate, "feeRate invalid");

      nftAddress = itemInstance.address;
      assetId = itemId;
      priceInUnit = "100000000000000000";
      const orderResponse = await marketplaceInstance.createOrder(
        nftAddress,
        assetId,
        priceInUnit,
        1,
        { from: accounts[0] }
      );
      perItemFee = orderResponse.receipt.logs[0].args.perItemFee.toNumber();
      assert.equal(0, perItemFee, "perItemFee invalid");
    });
    it("should failure for fee rate equal 1000000", async () => {
      const newFeeRate = 1000000;
      await truffleAssert.reverts(
        marketplaceInstance.setFeeRate(newFeeRate, { from: contractOwner }),
        "Marketplace: The owner cut should be between 0 and 999,999"
      );
    });
    it("setFeeHolder", async () => {
      const newHolder = accounts[7];

      const resFeeHolder = await marketplaceInstance.setFeeHolder(newHolder, {
        from: contractOwner,
      });

      assert.equal(
        newHolder,
        resFeeHolder.logs[0].args.feeHolder,
        "feeHolder invalid"
      );

      const reponse = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      countItemId++;
      const itemId = reponse.receipt.logs[0].args.tokenId.toNumber();

      await itemInstance.approve(marketplaceInstance.address, itemId, {
        from: accounts[0],
      });

      nftAddress = itemInstance.address;
      assetId = itemId;
      priceInUnit = "100000000000000000";
      const orderResponse = await marketplaceInstance.createOrder(
        nftAddress,
        assetId,
        priceInUnit,
        1,
        { from: accounts[0] }
      );
      const orderId = orderResponse.receipt.logs[0].args.id.toNumber();
      perItemFee = orderResponse.receipt.logs[0].args.perItemFee.toNumber();
      const sellerbalance = await MYTTokenInstance.balanceOf(accounts[0]);
      const buyerbalance = await MYTTokenInstance.balanceOf(accounts[1]);
      const feeHolderBalance = await MYTTokenInstance.balanceOf(newHolder);

      const result = await marketplaceInstance.executeOrder(
        orderId,
        priceInUnit,
        1,
        { from: accounts[1] }
      );
      assert.equal(result.receipt.status, true);

      const sellerbalanceAfter = await MYTTokenInstance.balanceOf(accounts[0]);
      const buyerbalanceAfter = await MYTTokenInstance.balanceOf(accounts[1]);
      const feeHolderBalanceAfter = await MYTTokenInstance.balanceOf(newHolder);

      const feeAmount = feeHolderBalance;
      assert(
        BigNumber(sellerbalanceAfter).isEqualTo(
          BigNumber(sellerbalance).plus(BigNumber(priceInUnit).minus(feeAmount))
        ),
        "Seller balance after invalid"
      );
      assert(
        BigNumber(buyerbalanceAfter).isEqualTo(
          BigNumber(buyerbalance).minus(priceInUnit)
        ),
        "Buyer balance invalid"
      );
      assert(
        BigNumber(feeHolderBalanceAfter).isEqualTo(
          BigNumber(feeHolderBalance).plus(feeAmount)
        ),
        "Fee holder balance balance after invalid"
      );
    });
    it("should failure for fee holder is marketplace address or zero address", async () => {
      await truffleAssert.reverts(
        marketplaceInstance.setFeeHolder(marketplaceInstance.address, {
          from: contractOwner,
        }),
        "Marketplace: _feeHolder is invalid"
      );
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      await truffleAssert.reverts(
        marketplaceInstance.setFeeHolder(zeroAddress, { from: contractOwner }),
        "Marketplace: _feeHolder is invalid"
      );
    });
  });

  describe("Upgrade smartcontract", async () => {
    let orderId, itemId;
    before("mint item and create order", async () => {
      const reponse = await itemInstance.mintItem(accounts[0], countItemId, {
        from: accounts[0],
      });
      itemId = reponse.receipt.logs[0].args.tokenId.toNumber();
      countItemId++;

      await itemInstance.approve(marketplaceInstance.address, itemId);

      const nftAddress = itemInstance.address;
      const assetId = itemId;
      const priceInUnit = "100000000000000000";
      const result = await marketplaceInstance.createOrder(
        nftAddress,
        assetId,
        priceInUnit,
        1,
        { from: accounts[0] }
      );

      orderId = result.receipt.logs[0].args.id.toNumber();
    });
    it("should failure when get order before upgrade", async () => {
      try {
        await marketplaceInstance.getOrder(orderId, { from: accounts[0] });
        assert(false, 'Should throw error when "getOrder" is not a function');
      } catch (error) {}
    });
  });
});
