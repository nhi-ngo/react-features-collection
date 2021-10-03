import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json()); // call this before being able to use `req.body`

const users = [
	{
		id: '1',
		username: 'Nhi',
		password: 'Nhi123',
		isAdmin: true,
	},
	{
		id: '2',
		username: 'John',
		password: 'John123',
		isAdmin: false,
	},
	{
		id: '3',
		username: 'Ann',
		password: 'Ann123',
		isAdmin: false,
	},
];

app.get('/', (req, res) => {
	res.send('Welcome to JWT');
});

let refreshTokens = [];

/* Refresh token */
app.post('/api/refresh', (req, res) => {
	// take the refreshed token from user
	const refreshToken = req.body.token;

	// send error if there is no token or it's invalid
	if (!refreshToken) {
		return res.status(401).json('You are not authenticated!');
	}
	if (!refreshTokens.includes(refreshToken)) {
		return res.status(403).json('Refresh token is not valid');
	}
	jwt.verify(refreshToken, 'myRefreshSecretKey', (err, user) => {
		err & console.log(err);
		refreshTokens = refreshTokens.filter(token !== refreshToken);

		// if everything is ok, create both new access token and refresh token, and send to user
		const newAccessToken = generateAccessToken(user);
		const newRefreshToken = generateRefreshToken(user);

		refreshTokens.push(newRefreshToken);

		res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
	});
});

const generateAccessToken = (user) => {
	return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, 'mySecretKey', { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
	return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, 'myRefreshSecretKey');
};

app.post('/api/login', (req, res) => {
	const { username, password } = req.body;

	const user = users.find((person) => {
		return person.username === username && person.password === password;
	});

	/* Generate access token */
	if (user) {
		const accessToken = generateAccessToken(user);
		const refreshToken = generateRefreshToken(user);
		refreshTokens.push(refreshToken);

		res.json({
			username: user.username,
			isAdmin: user.isAdmin,
			accessToken,
			refreshToken,
		});
	} else {
		res.status(400).json('Username or password incorrect');
	}

	/* Verify token */
	const verifyToken = (req, res, next) => {
		const authHeader = req.headers.authorization;
		if (authHeader) {
			const token = authHeader.split(' ')[1];
			jwt.verify(token, 'mySecretKey', (err, user) => {
				if (err) {
					// Having an invalid token
					return res.status(403).json('Token is not valid!');
				}

				// assign the payload
				req.user = user;
				next();
			});
		} else {
			// No token available
			res.status(401).json('You are not authenticated!');
		}
	};

	app.delete('/api/users/:userId', verifyToken, (req, res) => {
		if (req.user.id === req.params.userId || req.user.isAdmin) {
			res.status(200).json('User has been deleted');
		} else {
			res.status(403).json('You are not allowed to delete this user');
		}
	});
});

app.listen(5000, () => console.log('Backend server is running!'));
