import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { signup, login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="main-content">
      <div className="card" style={{maxWidth:480, margin:'40px auto'}}>
        <h2 className="page-title">{isSignup ? 'Create account' : 'Sign in'}</h2>
        {error && <div style={{color:'red'}}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm">Email</label>
            <input className="w-full mt-1 p-2 border rounded" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Password</label>
            <input type="password" className="w-full mt-1 p-2 border rounded" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button className="btn-primary" type="submit">{isSignup? 'Sign up' : 'Sign in'}</button>
        </form>
        <div style={{marginTop:12}}>
          <button className="btn-primary" style={{background:'#eee', color:'#111'}} onClick={()=>setIsSignup(!isSignup)}>{isSignup ? 'Have an account? Sign in' : 'Create an account'}</button>
        </div>
      </div>
    </div>
  );
}
