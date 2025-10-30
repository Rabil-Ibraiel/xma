import GeneralParty from "./component/GeneralParty";
import RegionBasedParty from "./component/RegionBasedParty";

export default function Home() {
  return (
    <div className="w-[1600px] mx-auto my-4 flex flex-col gap-12">
      <div className="bg-gray-200 rounded p-2">
        <h1 className="bg-blue-700 text-white font-bold text-3xl rounded py-2 pr-5">
        الاحزاب بشكل عام
        
      </h1>

      <GeneralParty />
      </div>
      

      <div className="bg-cyan-200 rounded p-2">
        <h1 className="bg-blue-700 text-white font-bold text-3xl rounded py-2 pr-5">
        الاحزاب بحسب المناطق
      </h1>
      <RegionBasedParty />
      </div>
    </div>
  );
}
