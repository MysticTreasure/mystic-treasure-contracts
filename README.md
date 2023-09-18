### Install truffle:

```
npm install -g truffle
```

### Install dependency libraries

```
npm install
```

### Environment

Copy .env from .env.example

### Test token deploy + transfer

```
truffle test ./test/MYTToken.js
```

### Compile smart contract

```
truffle compile
```

### Deploy smart contract

```
truffle migrate -f {fromIndex} --to {toIndex} --network {network}
```

### Verify source smartcontract

```
truffle run verify {Smartcontract Name} --network {network}
```
