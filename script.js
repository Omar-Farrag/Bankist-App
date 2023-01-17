"use strict";

/////////////////////////////////////////DATA/////////////////////////////////////////

const account1 = {
	owner: "Jonas Schmedtmann",
	movements: [200, 455.23, -306.5, 25000, -642.21, -133.9, 79.97, 1300],
	interestRate: 1.2, // %
	pin: 1111,

	movementsDates: [
		"2019-11-18T21:31:17.178Z",
		"2019-12-23T07:42:02.383Z",
		"2020-01-28T09:15:04.904Z",
		"2020-04-01T10:17:24.185Z",
		"2020-05-08T14:11:59.604Z",
		"2020-05-27T17:01:17.194Z",
		"2020-07-11T23:36:17.929Z",
		"2020-07-12T10:51:36.790Z",
	],
	currency: "EUR",
	locale: "pt-PT", // de-DE
};

const account2 = {
	owner: "Jessica Davis",
	movements: [5000, 3400, -150, -790, -3210, -1000, 8500, -30],
	interestRate: 1.5,
	pin: 2222,

	movementsDates: [
		"2019-11-01T13:15:33.035Z",
		"2019-11-30T09:48:16.867Z",
		"2019-12-25T06:04:23.907Z",
		"2020-01-25T14:18:46.235Z",
		"2020-02-05T16:33:06.386Z",
		"2020-04-10T14:43:26.374Z",
		"2020-06-25T18:49:59.371Z",
		"2020-07-26T12:01:20.894Z",
	],
	currency: "USD",
	locale: "en-US",
};

const dateTimeOptions = {
	hour: "numeric",
	minute: "numeric",
	day: "numeric",
	month: "numeric",
	year: "numeric",
};

const accounts = [account1, account2];
let currentAccount = accounts[0];
let sorted = false;

//Creates a username for each account based from the initials of the account owner
const createUsernames = function (accounts) {
	accounts.forEach(function (account) {
		account.username = account.owner
			.split(" ")
			.map(value => value[0].toLowerCase())
			.join("");
	});
};
createUsernames(accounts);

//Logs a transaction to the given account's transactions
const insertTransaction = function (account, amount) {
	account.movements.push(amount);
	account.movementsDates.push(new Date().toISOString());
};

/////////////////////////////////////////DOM ELEMENTS/////////////////////////////////////////

const labelWelcome = document.querySelector(".welcome");
const labelDate = document.querySelector(".date");
const labelBalance = document.querySelector(".balance__value");
const labelSumIn = document.querySelector(".summary__value--in");
const labelSumOut = document.querySelector(".summary__value--out");
const labelSumInterest = document.querySelector(".summary__value--interest");
const labelTimer = document.querySelector(".timer");

const containerApp = document.querySelector(".app");
const containerMovements = document.querySelector(".movements");

const btnLogin = document.querySelector(".login__btn");
const btnTransfer = document.querySelector(".form__btn--transfer");
const btnLoan = document.querySelector(".form__btn--loan");
const btnClose = document.querySelector(".form__btn--close");
const btnSort = document.querySelector(".btn--sort");

const inputLoginUsername = document.querySelector(".login__input--user");
const inputLoginPin = document.querySelector(".login__input--pin");
const inputTransferTo = document.querySelector(".form__input--to");
const inputTransferAmount = document.querySelector(".form__input--amount");
const inputLoanAmount = document.querySelector(".form__input--loan-amount");
const inputCloseUsername = document.querySelector(".form__input--user");
const inputClosePin = document.querySelector(".form__input--pin");
let timer;

/////////////////////////////////////////Calculations/////////////////////////////////////////

//calculates the number of days that have passed between two dates
const calcDaysPassed = (date1, date2) => Math.floor(Math.abs((date2 - date1) / 1000 / 60 / 60 / 24));

//calculates the balance on an account which is the net of deposits and withdrawals
const calcBalance = function (account) {
	account.balance = account.movements.reduce((accumulator, movement) => accumulator + movement, 0);
};

//Calculates total deposits, withdrawals, and interest
const calcSummary = function (account) {
	const deposits = account.movements.filter(isADeposit).reduce((total, movement) => total + movement);

	const withdrawals = account.movements.filter(isAWithdrawal).reduce((total, movement) => total + movement);

	const interest = account.movements
		.filter(isADeposit)
		.map(getInterestForDeposit.bind(account))
		.filter(interest => interest > 1)
		.reduce((total, interest) => total + interest, 0);
	return [deposits, withdrawals, interest];
};

//Calculates the interest amount for a specific deposit
const getInterestForDeposit = function (deposit) {
	return (deposit * this.interestRate) / 100;
};

const isADeposit = movement => movement > 0;

const isAWithdrawal = movement => !isADeposit(movement);

//Verifies the input pin with the account's stored pin
const verifiedCredentials = () => currentAccount?.pin === +inputLoginPin.value;

//Validates the amount to be transferred
const validTransferRequest = function (amount, receiverAcc) {
	return amount < 0 || currentAccount.balance < amount || !receiverAcc || receiverAcc === currentAccount;
};

/////////////////////////////////////////FORMATTING/////////////////////////////////////////

const formatCurrency = function (value, locale, currency) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: currency,
	}).format(value);
};

//Sorts transactions based on amount of money exchanged
const sortTransactions = function (transactions) {
	return new Map([...transactions].sort(([mov1], [mov2]) => mov1 - mov2));
};

//Formats minutes and seconds to have string with each having two digits
const formatTime = (mins, seconds) => `${mins.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

//Returns the date of a transaction as a readable string based on account locale options
const getTransactionDateString = function (originalDate) {
	const currentDate = new Date();
	const daysPassed = calcDaysPassed(originalDate, currentDate);

	switch (daysPassed) {
		case 0:
			return "Today";
		case 1:
			return "Yesterday";
		default:
			return new Intl.DateTimeFormat(currentAccount.locale, dateTimeOptions).format(originalDate);
	}
};

/////////////////////////////////////////TIMERS/////////////////////////////////////////

//Checks if a session has timed out
const sessionTimeOut = (mins, seconds) => mins === 0 && seconds === 0;

//Resets Logout timer to default number of minutes and seconds
const resetLogOutTimer = function (timer) {
	if (timer) clearInterval(timer);
	timer = startLogOutTimer();
};

//Starts the logout timer countdown for default duration
const startLogOutTimer = function (mins = 5, seconds = 0) {
	labelTimer.innerHTML = formatTime(mins, seconds);

	const timerInterval = setInterval(function () {
		if (sessionTimeOut(mins, seconds)) forceLogOut(timerInterval, "Your session has timed out...Please login again");
		else if (seconds === 0) mins--;
		seconds = (((seconds - 1) % 60) + 60) % 60;
		labelTimer.innerHTML = formatTime(mins, seconds);
	}, 1000);
	return timerInterval;
};

/////////////////////////////////////////UI AND DISPLAY/////////////////////////////////////////

const displayBalance = function (account) {
	calcBalance(account);
	labelBalance.textContent = formatCurrency(account.balance, account.locale, account.currency);
};

const displaySummary = function (account) {
	const [deposits, withdrawals, interest] = calcSummary(account);

	labelSumIn.textContent = formatCurrency(deposits, account.locale, account.currency);
	labelSumOut.textContent = formatCurrency(Math.abs(withdrawals), account.locale, account.currency);
	labelSumInterest.textContent = formatCurrency(interest, account.locale, account.currency);
};

//Displays all transactions with the option to sort them based on transaction amount
const displayMovements = function (account, sort = false) {
	labelDate.textContent = new Intl.DateTimeFormat(account.locale, dateTimeOptions).format(new Date());

	containerMovements.innerHTML = "";

	let transactions = new Map();
	for (let i = 0; i < account.movements.length; i++) transactions.set(account.movements[i], account.movementsDates[i]);

	if (sort) transactions = sortTransactions(transactions);

	let counter = 1;
	transactions.forEach(function (date, movement) {
		const type = isADeposit(movement) ? "deposit" : "withdrawal";
		const html = `
	  <div class="movements__row">
	  <div class="movements__type movements__type--${type}">${counter++} ${type}</div>
	<div>${getTransactionDateString(new Date(date))}</div>
	  <div class="movements__value">${formatCurrency(movement, account.locale, account.currency)}</div>
	</div>
	`;
		containerMovements.insertAdjacentHTML("afterbegin", html);
	});
};

//Shows all given account movements, balance, and summary
const updateUI = function (account) {
	sorted = false;
	displayMovements(account);
	displayBalance(account);
	displaySummary(account);
};

//Logs the user out of the account and displays the passed logout message
const forceLogOut = function (timer = 0, logOutMessage) {
	labelWelcome.innerHTML = logOutMessage;
	containerApp.style.opacity = "0";
	resetLogOutTimer(timer);
};

//Logs a user to his/her account after verifying credentials
const logIn = function () {
	labelWelcome.textContent = `Welcome back, ${currentAccount.owner.split(" ")[0]}`;
	containerApp.style.opacity = "1";
	updateUI(currentAccount);
	resetLogOutTimer();
};

/////////////////////////////////////////EVENT HANDLERS/////////////////////////////////////////

//Logs a user to account when clicked
btnLogin.addEventListener("click", function (event) {
	event.preventDefault();

	currentAccount = accounts.find(account => account.username === inputLoginUsername.value);
	if (!currentAccount) forceLogOut(_, "Invalid Login Information");
	else if (verifiedCredentials()) logIn();
	else forceLogOut(_, "Wrong Pin Number");

	inputLoginPin.value = "";
	inputLoginUsername.value = "";
	inputLoginPin.blur();
});

//Transfers the input amount of money to another account if valid
btnTransfer.addEventListener("click", function (event) {
	event.preventDefault();
	const amount = Number(inputTransferAmount.value);
	const receiverAcc = accounts.find(account => account.username === inputTransferTo.value);

	inputTransferAmount.value = inputTransferTo.value = "";
	inputTransferAmount.blur();

	if (validTransferRequest(amount, receiverAcc)) return;

	insertTransaction(currentAccount, -amount);
	insertTransaction(receiverAcc, amount);

	resetLogOutTimer(timer);
	updateUI(currentAccount);
});

//Deletes an account
btnClose.addEventListener("click", function (event) {
	event.preventDefault();
	const username = inputCloseUsername.value;
	const pin = +inputClosePin.value;

	if (currentAccount.pin === pin && currentAccount.username === username) {
		const index = accounts.findIndex(account => account.username === username);
		accounts.splice(index, 1);
		inputCloseUsername.value = inputClosePin.value = "";
		forceLogOut(timer, "Your account was deleted successfully");
	}
});

//Loans the account holder the requested amount of money if valid
btnLoan.addEventListener("click", function (event) {
	event.preventDefault();
	const amount = Math.floor(inputLoanAmount.value);

	const loanValid = currentAccount.movements.some(movement => movement >= (amount * 10) / 100) && amount > 0;
	if (loanValid) {
		setTimeout(function () {
			insertTransaction(currentAccount, amount);
			updateUI(currentAccount);
			inputLoanAmount.value = "";
			inputLoanAmount.blur();
		}, 2500);
	}
	resetLogOutTimer(timer);
});

//Toggles between sorted and unsorted modes when button is clicked
btnSort.addEventListener("click", function (event) {
	event.preventDefault();
	sorted ^= 1;
	displayMovements(currentAccount, sorted);
	resetLogOutTimer(timer);
});
