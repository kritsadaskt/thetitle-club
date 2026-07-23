import Image from "next/image";

function HowToJoinSection() {
  return (
    <div
      className="py-20 bg-cream-200 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/club/how-to_bg.webp')" }}
    >
      <div className="container mx-auto px-4">
        <Image src="/club/how-to-join-headline.webp" alt="How to Join" width={1000} height={1000} className="w-5/6 md:w-1/3 mx-auto" />
        <div className="h-10" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="col-span-1">
            <Image src="/club/how-to-join-1.webp" alt="How to Join" width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              <span className="text-lime-400">Scan</span> Here
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-2.webp" alt="How to Join" width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              Tap <span className="text-lime-400">"Become Part of the Family"</span>
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-3.webp" alt="How to Join" width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              Fill in Your Details and<br />
              <span className="text-lime-400">Complete the Registration.</span>
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-4.webp" alt="How to Join" width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              A Membership confirmation E-mail<br className="md:hidden" />
              <span className="text-lime-400"> will be Sent to Your Registered<br/>
              E-mail Address.</span>
            </div>
          </div>
          <div className="col-span-1">
            <Image src="/club/how-to-join-5.webp" alt="How to Join" width={1000} height={1000} className="w-2/3 md:w-full mx-auto" />
            <div className="text-center text-white text-sm mt-4">
              Complete Your Registration<br />
              and <span className="text-lime-400">Start Enjoying Exclusive<br />
              Member Privileges.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="w-5/6 mx-auto">
          <h2 className="text-4xl text-white text-center">How to Redeem <span className="text-lime-400">Privileges</span></h2>
          <div className="h-10" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-1.webp" alt="How to Redeem" width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
              <span className="text-lime-400">• Sign in to Your Profile</span><br />
              <span className="text-lime-400">• Tap the Menu Icon</span> at the Top-Right<br />
              Corner of the Screen.
              </div>
            </div>
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-2.webp" alt="How to Redeem" width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
              From the Side Menu, Tap <span className="text-lime-400">“Privileges”</span><br />
              to Explore Exclusive Member.
              </div>
            </div>
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-4.webp" alt="How to Redeem" width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
                Choose Your Preferred<br />
                Privilege and Tap<br />
                <span className="text-lime-400">“Use This Privilege”</span>
              </div>
            </div>
            <div className="col-span-1">
              <Image src="/club/how-to-redeem-3.webp" alt="How to Redeem" width={1000} height={1000} />
              <div className="text-center text-white text-sm mt-4">
              <span className="text-lime-400">Show Your QR Code or Privilege Code</span><br />
              to the Merchant<br />
              to Redeem Your Privilege.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowToJoinSection;
