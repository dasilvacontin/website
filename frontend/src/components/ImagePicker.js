import React, { Component } from 'react';
import ImageUpload from './ImageUpload';
import _ from 'underscore';

const REG_VALID_URL = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
const REG_VALID_TWITTER_USERNAME = /^[a-zA-Z0-9_]{1,15}$/;
const PRESET_AVATARS = [
  '/static/images/users/icon-avatar-placeholder.svg',
  '/static/images/users/avatar-02.svg',
  '/static/images/users/avatar-03.svg',
];
const KNOWN_SOURCES = {
  'facebook': '/static/images/users/facebook-badge.svg',
  'twitter': '/static/images/users/twitter-badge.svg',
  'google': '/static/images/users/google-badge.svg',
}

export default class ImagePicker extends Component {

  constructor(props) {
    super(props);
    this.options = PRESET_AVATARS.map(src => {return {source: 'preset', src: src}});

    if (props.src)
    {
      this.options[0].src = props.src;
      this.options[0].source = 'default';
    }

    this.options.push({
      source: 'upload',
      src: '/static/images/users/upload-default.svg'
    });

    this.state = {
      isLoading: false,
      currentIndex: 0,
      twitter: '',
      website: '',
    };

    this.lazyLookupSocialMediaAvatars = _.debounce(this.lookupSocialMediaAvatars.bind(this), 600);
  }

  render() {
    const {className='avatar'} = this.props;
    const {isLoading, currentIndex} = this.state;
    const options = this.options;
    const currentOption = options[currentIndex];

    return (
      <div className={`ImagePicker-container ${className}`}>
        <div className="ImagePicker-loader" style={{display : (isLoading ? 'block' : 'none')}}>
          <div className="loader"></div>
        </div>
        <div className="ImagePicker-label">Choose a Profile Image</div>
        <div className={this.prevIsPossible() ? 'ImagePicker-prev active' : 'ImagePicker-prev'} onClick={this.prev.bind(this)}></div>
        <div className='ImagePicker-preview' onClick={() => this.avatarClick.call(this, currentOption)}>
          <img src={currentOption.src} width="64px" height="64px"/>
        </div>
        <div className='ImagePicker-source-badge' style={{display : (KNOWN_SOURCES[currentOption.source] ? 'block' : 'none')}}>
          <img src={KNOWN_SOURCES[currentOption.source]}/>
        </div>
        <div className={this.nextIsPossible() ? 'ImagePicker-next active' : 'ImagePicker-next'} onClick={this.next.bind(this)}></div>
        <ul className='ImagePicker-dot-list'>
          {options.map(
            option => {
              return <li key={option.source + option.src} onClick={() => this.select.call(this, option)} className={option === options[currentIndex] ? 'selected' : ''}></li>;
            }
          )}
        </ul>
        <div className="ImageUpload-container">
          <ImageUpload ref="ImageUpload" isUploading={false} onFinished={this.onUploadFinished.bind(this)} {...this.props} />
        </div>
      </div>
    );
  }

  componentWillReceiveProps(nextProps) {
    const {website, twitter} = nextProps;
    if (website !== this.state.website || twitter !== this.state.twitter)
    {
      this.state.twitter = REG_VALID_TWITTER_USERNAME.test(twitter) ? twitter : '';
      this.state.website = REG_VALID_URL.test(website) ? website : '';
      
      if (this.state.twitter || this.state.website)
      {
        console.log('RELOOKUP')
        this.lazyLookupSocialMediaAvatars(this.state.website, this.state.twitter);
      }
    }
  }

  thereWasAChange()
  {
    this.props.handleChange(this.options[this.state.currentIndex].src);
  }

  nextIsPossible()
  {
    return this.state.currentIndex < this.options.length - 1;
  }

  prevIsPossible()
  {
    return this.state.currentIndex > 0;
  }

  select(option)
  {
    if (this.state.isLoading) return;
    this.setState({currentIndex: this.options.indexOf(option)});
    this.thereWasAChange();
  }

  next()
  {
    if (this.state.isLoading) return;
    if (this.nextIsPossible())
    {
      this.setState({currentIndex: this.state.currentIndex + 1});
      this.thereWasAChange();
    }
  }

  prev()
  {
    if (this.state.isLoading) return;
    if (this.prevIsPossible())
    {
      this.setState({currentIndex: this.state.currentIndex - 1});
      this.thereWasAChange();
    }
  }

  avatarClick(option)
  {
    if (option.source === 'preset' || option.source === 'upload')
    {
      this.refs.ImageUpload.clickInput();
    }
  }

  onUploadFinished(result)
  {
    if (result)
    {
      const uploadOption = this.options.reduce((prev, curr) => prev.source === 'upload' ? prev : curr);
      uploadOption.src = result.url;
      this.setState({currentIndex: this.options.indexOf(uploadOption)});
      this.thereWasAChange();
    }
  }

  lookupSocialMediaAvatars(website, twitter)
  {
    const { profileForm, newUser, getSocialMediaAvatars } = this.props;

    if (!this.state.isLoading)
    {
      this.setState({isLoading: true});
    }

    getSocialMediaAvatars(newUser.id, {website: website, twitterHandle: twitter, name: profileForm.name})
    .then((result) => {
      result.json.forEach(result => {
        const existingOption = this.options.filter((option) => {return option.source === result.source})[0];
        if (existingOption)
        {
          existingOption.src = result.src;
        }
        else
        {
          if (this.options[0].source === 'preset')
          {
            this.options[0].source = result.source;
            this.options[0].src = result.src;
            this.setState({currentIndex: 0});
          }
          else
          {
            this.options.splice(0, 0, result);
            this.setState({currentIndex: 0});
          }
        }
        this.thereWasAChange();
      });

      this.setState({isLoading: false});
    })
    .catch((error) => {
      console.error(error);
      this.setState({isLoading: false});
    })
  }
}
