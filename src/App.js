import './App.css';
import Headers from './components/Headers/Header';
import Footer from './components/Footer/Footer';
import ContainerInput from './components/Container/ContainerInput';
import TableResult from './components/TableResult/TableResult';

function App() {
  return (
    <>
    <Headers />
    <main>
      <ContainerInput />
      <TableResult />
    </main>
    <Footer />
    </>
  );
}

export default App;
